import type { Env } from '../types';
import { xmlParser } from './xml-parser';

const CACHE_TTL = 3600; // 1 hour in seconds

export interface FeedMetadata {
  id: number;
  url: string;
  r2_key: string | null;
  source_last_modified: string | null;
  source_etag: string | null;
  source_checked_at: string | null;
  last_fetched_at: string | null;
  update_available: boolean;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  lastModified: string | null;
  etag: string | null;
  checkedAt: string;
}

export class FeedService {
  constructor(private env: Env) {}

  /**
   * Check if source has updates without downloading (HEAD request)
   */
  async checkForUpdates(feedId: number): Promise<CheckUpdateResult> {
    const feed = await this.env.DB.prepare(
      'SELECT url, source_last_modified, source_etag FROM source_feeds WHERE id = ?'
    )
      .bind(feedId)
      .first<{ url: string; source_last_modified: string | null; source_etag: string | null }>();

    if (!feed) {
      throw new Error('Feed not found');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'XmlCustomizer/1.0',
    };

    // Add conditional headers if we have cached values
    if (feed.source_last_modified) {
      headers['If-Modified-Since'] = feed.source_last_modified;
    }
    if (feed.source_etag) {
      headers['If-None-Match'] = feed.source_etag;
    }

    const now = new Date().toISOString();

    try {
      // Do a HEAD request first to check headers
      const response = await fetch(feed.url, {
        method: 'HEAD',
        headers,
      });

      const lastModified = response.headers.get('Last-Modified');
      const etag = response.headers.get('ETag');

      // 304 means no changes
      if (response.status === 304) {
        await this.env.DB.prepare(
          `UPDATE source_feeds
           SET source_checked_at = ?, update_available = 0
           WHERE id = ?`
        )
          .bind(now, feedId)
          .run();

        return {
          hasUpdate: false,
          lastModified: feed.source_last_modified,
          etag: feed.source_etag,
          checkedAt: now,
        };
      }

      // Check if headers indicate a change
      const hasUpdate =
        (lastModified && lastModified !== feed.source_last_modified) ||
        (etag && etag !== feed.source_etag) ||
        (!feed.source_last_modified && !feed.source_etag); // First check

      await this.env.DB.prepare(
        `UPDATE source_feeds
         SET source_checked_at = ?, update_available = ?
         WHERE id = ?`
      )
        .bind(now, hasUpdate ? 1 : 0, feedId)
        .run();

      return {
        hasUpdate,
        lastModified,
        etag,
        checkedAt: now,
      };
    } catch (error) {
      // On error, just update checked_at
      await this.env.DB.prepare(
        `UPDATE source_feeds SET source_checked_at = ? WHERE id = ?`
      )
        .bind(now, feedId)
        .run();
      throw error;
    }
  }

  /**
   * Fetch XML from source URL and cache in R2
   * Uses conditional fetching if we have Last-Modified/ETag
   */
  async fetchAndCacheFeed(feedId: number, url: string, force: boolean = false): Promise<{ xml: string; wasUpdated: boolean }> {
    // Get current metadata
    const currentMeta = await this.env.DB.prepare(
      'SELECT source_last_modified, source_etag FROM source_feeds WHERE id = ?'
    )
      .bind(feedId)
      .first<{ source_last_modified: string | null; source_etag: string | null }>();

    const headers: Record<string, string> = {
      'User-Agent': 'XmlCustomizer/1.0',
      Accept: 'application/xml, text/xml',
    };

    // Add conditional headers unless forced
    if (!force && currentMeta) {
      if (currentMeta.source_last_modified) {
        headers['If-Modified-Since'] = currentMeta.source_last_modified;
      }
      if (currentMeta.source_etag) {
        headers['If-None-Match'] = currentMeta.source_etag;
      }
    }

    const response = await fetch(url, { headers });
    const now = new Date().toISOString();

    // 304 Not Modified - content hasn't changed
    if (response.status === 304) {
      await this.env.DB.prepare(
        `UPDATE source_feeds
         SET source_checked_at = ?, update_available = 0
         WHERE id = ?`
      )
        .bind(now, feedId)
        .run();

      // Return existing cached content
      const cached = await this.getFeedXmlFromCache(feedId);
      if (cached) {
        return { xml: cached, wasUpdated: false };
      }
      // If cache is empty somehow, force a fresh fetch
      return this.fetchAndCacheFeed(feedId, url, true);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    const xmlContent = await response.text();
    const r2Key = `feeds/${feedId}/source.xml`;

    // Get headers for caching
    const lastModified = response.headers.get('Last-Modified');
    const etag = response.headers.get('ETag');

    // Store in R2
    await this.env.R2.put(r2Key, xmlContent, {
      httpMetadata: {
        contentType: 'application/xml',
      },
      customMetadata: {
        fetchedAt: now,
        sourceUrl: url,
        lastModified: lastModified || '',
        etag: etag || '',
      },
    });

    // Update database with property count and metadata
    const properties = xmlParser.getPropertySummaries(xmlContent);
    await this.env.DB.prepare(
      `UPDATE source_feeds
       SET r2_key = ?,
           property_count = ?,
           last_fetched_at = ?,
           source_last_modified = ?,
           source_etag = ?,
           source_checked_at = ?,
           update_available = 0,
           updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(
        r2Key,
        properties.length,
        now,
        lastModified,
        etag,
        now,
        feedId
      )
      .run();

    // Invalidate cached customer XMLs for this feed
    await this.invalidateFeedCache(feedId);

    return { xml: xmlContent, wasUpdated: true };
  }

  /**
   * Get XML content from R2 cache only (never auto-fetch)
   */
  async getFeedXmlFromCache(feedId: number): Promise<string | null> {
    const feed = await this.env.DB.prepare(
      'SELECT r2_key FROM source_feeds WHERE id = ?'
    )
      .bind(feedId)
      .first<{ r2_key: string | null }>();

    if (!feed?.r2_key) return null;

    const r2Object = await this.env.R2.get(feed.r2_key);
    if (!r2Object) return null;

    return await r2Object.text();
  }

  /**
   * Get XML content from R2 cache or fetch if not cached
   * Note: This will only auto-fetch if there's NO cache at all
   */
  async getFeedXml(feedId: number): Promise<string | null> {
    const feed = await this.env.DB.prepare(
      'SELECT * FROM source_feeds WHERE id = ?'
    )
      .bind(feedId)
      .first<{ id: number; url: string; r2_key: string | null }>();

    if (!feed) return null;

    // Try to get from R2 first
    if (feed.r2_key) {
      const r2Object = await this.env.R2.get(feed.r2_key);
      if (r2Object) {
        return await r2Object.text();
      }
    }

    // Only fetch if we have NO cached content at all
    const result = await this.fetchAndCacheFeed(feed.id, feed.url);
    return result.xml;
  }

  /**
   * Get filtered XML for a specific customer
   */
  async getCustomerFeedXml(
    customerHashId: string,
    feedId: number
  ): Promise<string | null> {
    // Check KV cache first
    const cacheKey = `customer:${customerHashId}:feed:${feedId}`;
    const cached = await this.env.KV.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get customer and their selections
    const customer = await this.env.DB.prepare(
      'SELECT id FROM customers WHERE hash_id = ?'
    )
      .bind(customerHashId)
      .first<{ id: number }>();

    if (!customer) return null;

    // Get selected property IDs
    const selections = await this.env.DB.prepare(
      'SELECT property_id FROM customer_selections WHERE customer_id = ? AND feed_id = ?'
    )
      .bind(customer.id, feedId)
      .all<{ property_id: string }>();

    if (!selections.results || selections.results.length === 0) {
      return null;
    }

    const propertyIds = selections.results.map((s) => s.property_id);

    // Get source XML from cache
    const sourceXml = await this.getFeedXml(feedId);
    if (!sourceXml) return null;

    // Filter XML
    const filteredXml = xmlParser.filterXml(sourceXml, propertyIds);

    // Cache in KV
    await this.env.KV.put(cacheKey, filteredXml, { expirationTtl: CACHE_TTL });

    return filteredXml;
  }

  /**
   * Invalidate all cached customer XMLs for a feed
   */
  async invalidateFeedCache(feedId: number): Promise<void> {
    // Get all customers with selections for this feed
    const customers = await this.env.DB.prepare(
      `SELECT DISTINCT c.hash_id
       FROM customers c
       JOIN customer_selections cs ON c.id = cs.customer_id
       WHERE cs.feed_id = ?`
    )
      .bind(feedId)
      .all<{ hash_id: string }>();

    if (customers.results) {
      for (const customer of customers.results) {
        const cacheKey = `customer:${customer.hash_id}:feed:${feedId}`;
        await this.env.KV.delete(cacheKey);
      }
    }
  }

  /**
   * Invalidate cache for a specific customer
   */
  async invalidateCustomerCache(customerId: number): Promise<void> {
    const customer = await this.env.DB.prepare(
      'SELECT hash_id FROM customers WHERE id = ?'
    )
      .bind(customerId)
      .first<{ hash_id: string }>();

    if (!customer) return;

    // Get all feeds this customer has selections for
    const feeds = await this.env.DB.prepare(
      'SELECT DISTINCT feed_id FROM customer_selections WHERE customer_id = ?'
    )
      .bind(customerId)
      .all<{ feed_id: number }>();

    if (feeds.results) {
      for (const feed of feeds.results) {
        const cacheKey = `customer:${customer.hash_id}:feed:${feed.feed_id}`;
        await this.env.KV.delete(cacheKey);
      }
    }
  }

  /**
   * Get feeds that need to be checked for updates
   * (haven't been checked in the last X hours)
   */
  async getFeedsNeedingCheck(hoursAgo: number = 6): Promise<number[]> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    const feeds = await this.env.DB.prepare(
      `SELECT id FROM source_feeds
       WHERE source_checked_at IS NULL
          OR source_checked_at < ?`
    )
      .bind(cutoff)
      .all<{ id: number }>();

    return feeds.results?.map((f) => f.id) || [];
  }

  /**
   * Check all feeds for updates (used by cron)
   */
  async checkAllFeedsForUpdates(): Promise<{ checked: number; withUpdates: number }> {
    const feedIds = await this.getFeedsNeedingCheck(6);
    let withUpdates = 0;

    for (const feedId of feedIds) {
      try {
        const result = await this.checkForUpdates(feedId);
        if (result.hasUpdate) {
          withUpdates++;
        }
      } catch (error) {
        console.error(`Failed to check feed ${feedId}:`, error);
      }
    }

    return { checked: feedIds.length, withUpdates };
  }
}
