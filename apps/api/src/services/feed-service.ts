import type { Env } from '../types';
import { xmlParser } from './xml-parser';

const CACHE_TTL = 3600; // 1 hour in seconds

export class FeedService {
  constructor(private env: Env) {}

  /**
   * Fetch XML from source URL and cache in R2
   */
  async fetchAndCacheFeed(feedId: number, url: string): Promise<string> {
    // Fetch from source
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'XmlCustomizer/1.0',
        Accept: 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    const xmlContent = await response.text();
    const r2Key = `feeds/${feedId}/source.xml`;

    // Store in R2
    await this.env.R2.put(r2Key, xmlContent, {
      httpMetadata: {
        contentType: 'application/xml',
      },
      customMetadata: {
        fetchedAt: new Date().toISOString(),
        sourceUrl: url,
      },
    });

    // Update database with property count
    const properties = xmlParser.getPropertySummaries(xmlContent);
    await this.env.DB.prepare(
      `UPDATE source_feeds
       SET r2_key = ?, property_count = ?, last_fetched_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    )
      .bind(r2Key, properties.length, feedId)
      .run();

    // Invalidate cached customer XMLs for this feed
    await this.invalidateFeedCache(feedId);

    return xmlContent;
  }

  /**
   * Get XML content from R2 cache or fetch fresh
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

    // Fetch fresh if not in cache
    return await this.fetchAndCacheFeed(feed.id, feed.url);
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

    // Get source XML
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
}
