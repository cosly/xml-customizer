import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { SourceFeed, CreateFeedRequest } from '@xml-customizer/shared';
import { FeedService } from '../services/feed-service';
import { xmlParser } from '../services/xml-parser';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/feeds - List all feeds for current user
 */
app.get('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const feeds = await c.env.DB.prepare(
    `SELECT * FROM source_feeds WHERE user_id = ? ORDER BY created_at DESC`
  )
    .bind(user.id)
    .all<SourceFeed>();

  return c.json(feeds.results);
});

/**
 * GET /api/feeds/:id - Get feed by ID
 */
app.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  const feed = await c.env.DB.prepare('SELECT * FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<SourceFeed>();

  if (!feed) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  return c.json(feed);
});

/**
 * POST /api/feeds - Create new feed
 */
app.post('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json<CreateFeedRequest>();

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Validation', message: 'Name is required' }, 400);
  }

  if (!body.url || body.url.trim() === '') {
    return c.json({ error: 'Validation', message: 'URL is required' }, 400);
  }

  // Validate URL format
  try {
    new URL(body.url);
  } catch {
    return c.json({ error: 'Validation', message: 'Invalid URL format' }, 400);
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO source_feeds (name, url, user_id) VALUES (?, ?, ?)
     RETURNING *`
  )
    .bind(body.name.trim(), body.url.trim(), user.id)
    .first<SourceFeed>();

  return c.json(result, 201);
});

/**
 * PUT /api/feeds/:id - Update feed
 */
app.put('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  const body = await c.req.json<Partial<CreateFeedRequest>>();

  const result = await c.env.DB.prepare(
    `UPDATE source_feeds
     SET name = COALESCE(?, name), url = COALESCE(?, url), updated_at = datetime('now')
     WHERE id = ? AND user_id = ?
     RETURNING *`
  )
    .bind(body.name || null, body.url || null, id, user.id)
    .first<SourceFeed>();

  if (!result) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  return c.json(result);
});

/**
 * DELETE /api/feeds/:id - Delete feed
 */
app.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  // Delete from R2
  const feed = await c.env.DB.prepare('SELECT r2_key FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ r2_key: string | null }>();

  if (!feed) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  if (feed.r2_key) {
    await c.env.R2.delete(feed.r2_key);
  }

  await c.env.DB.prepare('DELETE FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();

  return c.json({ success: true });
});

/**
 * POST /api/feeds/:id/refresh - Refresh feed from source URL
 */
app.post('/:id/refresh', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  const feed = await c.env.DB.prepare('SELECT * FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<SourceFeed>();

  if (!feed) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  try {
    const feedService = new FeedService(c.env);
    await feedService.fetchAndCacheFeed(feed.id, feed.url);

    const updated = await c.env.DB.prepare('SELECT * FROM source_feeds WHERE id = ?')
      .bind(id)
      .first<SourceFeed>();

    return c.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Fetch failed', message }, 500);
  }
});

/**
 * GET /api/feeds/:id/properties - Get properties from feed
 */
app.get('/:id/properties', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  // Verify feed belongs to user
  const feed = await c.env.DB.prepare('SELECT id FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first();

  if (!feed) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  const feedService = new FeedService(c.env);
  const xmlContent = await feedService.getFeedXml(Number(id));

  if (!xmlContent) {
    return c.json({ error: 'Not found', message: 'Feed not found or empty' }, 404);
  }

  const properties = xmlParser.getPropertySummaries(xmlContent);
  return c.json(properties);
});

/**
 * POST /api/feeds/:id/purge-cache - Purge all cached customer XMLs for this feed
 */
app.post('/:id/purge-cache', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');

  const feed = await c.env.DB.prepare('SELECT id FROM source_feeds WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first();

  if (!feed) {
    return c.json({ error: 'Not found', message: 'Feed not found' }, 404);
  }

  const feedService = new FeedService(c.env);
  await feedService.invalidateFeedCache(Number(id));

  return c.json({ success: true, message: 'Cache purged' });
});

export default app;
