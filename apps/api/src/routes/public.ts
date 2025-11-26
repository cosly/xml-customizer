import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { FeedService } from '../services/feed-service';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /feed/:hashId - Public endpoint to get customer's filtered XML feed
 *
 * This is the main public endpoint that customers will use to fetch their personalized XML.
 * Each customer has a unique hash_id that cannot be easily guessed.
 *
 * Query params:
 * - feed: (optional) feed ID, defaults to first available feed
 */
app.get('/:hashId', async (c) => {
  const hashId = c.req.param('hashId');
  const feedIdParam = c.req.query('feed');

  // Get customer by hash
  const customer = await c.env.DB.prepare(
    'SELECT id, name FROM customers WHERE hash_id = ?'
  )
    .bind(hashId)
    .first<{ id: number; name: string }>();

  if (!customer) {
    return c.text('Feed not found', 404);
  }

  // Get feed ID (either from query or first available)
  let feedId: number;

  if (feedIdParam) {
    feedId = parseInt(feedIdParam, 10);
    if (isNaN(feedId)) {
      return c.text('Invalid feed parameter', 400);
    }
  } else {
    // Get first feed with selections for this customer
    const firstFeed = await c.env.DB.prepare(
      `SELECT DISTINCT feed_id FROM customer_selections WHERE customer_id = ? LIMIT 1`
    )
      .bind(customer.id)
      .first<{ feed_id: number }>();

    if (!firstFeed) {
      return c.text('No properties configured for this feed', 404);
    }

    feedId = firstFeed.feed_id;
  }

  // Get filtered XML
  const feedService = new FeedService(c.env);
  const xml = await feedService.getCustomerFeedXml(hashId, feedId);

  if (!xml) {
    return c.text('No properties available', 404);
  }

  // Return XML with proper headers for caching
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // 1 hour browser cache
      'X-Customer': customer.name,
    },
  });
});

/**
 * GET /feed/:hashId/info - Get info about customer's feed (JSON)
 */
app.get('/:hashId/info', async (c) => {
  const hashId = c.req.param('hashId');

  const customer = await c.env.DB.prepare(
    'SELECT id, name FROM customers WHERE hash_id = ?'
  )
    .bind(hashId)
    .first<{ id: number; name: string }>();

  if (!customer) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  // Get feeds and property counts
  const feeds = await c.env.DB.prepare(
    `SELECT sf.id, sf.name, COUNT(cs.property_id) as property_count
     FROM source_feeds sf
     JOIN customer_selections cs ON sf.id = cs.feed_id
     WHERE cs.customer_id = ?
     GROUP BY sf.id, sf.name`
  )
    .bind(customer.id)
    .all<{ id: number; name: string; property_count: number }>();

  return c.json({
    customer: customer.name,
    feeds: feeds.results || [],
  });
});

export default app;
