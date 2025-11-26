import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import type { Customer, CreateCustomerRequest, UpdateSelectionsRequest } from '@xml-customizer/shared';
import { FeedService } from '../services/feed-service';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Generate a unique hash ID for customer endpoints
 */
function generateHashId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from({ length: len }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join('')
    )
    .join('-');
}

/**
 * GET /api/customers - List all customers
 */
app.get('/', async (c) => {
  const customers = await c.env.DB.prepare(
    `SELECT c.*,
       (SELECT COUNT(DISTINCT feed_id) FROM customer_selections WHERE customer_id = c.id) as feed_count,
       (SELECT COUNT(*) FROM customer_selections WHERE customer_id = c.id) as selection_count
     FROM customers c
     ORDER BY c.created_at DESC`
  ).all();

  return c.json(customers.results);
});

/**
 * GET /api/customers/:id - Get customer by ID
 */
app.get('/:id', async (c) => {
  const id = c.req.param('id');

  const customer = await c.env.DB.prepare(
    'SELECT * FROM customers WHERE id = ?'
  )
    .bind(id)
    .first<Customer>();

  if (!customer) {
    return c.json({ error: 'Not found', message: 'Customer not found' }, 404);
  }

  // Get selections grouped by feed
  const selections = await c.env.DB.prepare(
    `SELECT cs.feed_id, sf.name as feed_name, cs.property_id
     FROM customer_selections cs
     JOIN source_feeds sf ON cs.feed_id = sf.id
     WHERE cs.customer_id = ?
     ORDER BY sf.name, cs.property_id`
  )
    .bind(id)
    .all<{ feed_id: number; feed_name: string; property_id: string }>();

  // Group selections by feed
  const groupedSelections = (selections.results || []).reduce(
    (acc, sel) => {
      const existing = acc.find((s) => s.feed_id === sel.feed_id);
      if (existing) {
        existing.property_ids.push(sel.property_id);
      } else {
        acc.push({
          feed_id: sel.feed_id,
          feed_name: sel.feed_name,
          property_ids: [sel.property_id],
        });
      }
      return acc;
    },
    [] as Array<{ feed_id: number; feed_name: string; property_ids: string[] }>
  );

  return c.json({ ...customer, selections: groupedSelections });
});

/**
 * POST /api/customers - Create new customer
 */
app.post('/', async (c) => {
  const body = await c.req.json<CreateCustomerRequest>();

  if (!body.name || body.name.trim() === '') {
    return c.json({ error: 'Validation', message: 'Name is required' }, 400);
  }

  const hashId = generateHashId();

  const result = await c.env.DB.prepare(
    `INSERT INTO customers (name, email, hash_id) VALUES (?, ?, ?)
     RETURNING *`
  )
    .bind(body.name.trim(), body.email || null, hashId)
    .first<Customer>();

  return c.json(result, 201);
});

/**
 * PUT /api/customers/:id - Update customer
 */
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<CreateCustomerRequest>>();

  const result = await c.env.DB.prepare(
    `UPDATE customers
     SET name = COALESCE(?, name), email = COALESCE(?, email), updated_at = datetime('now')
     WHERE id = ?
     RETURNING *`
  )
    .bind(body.name || null, body.email || null, id)
    .first<Customer>();

  if (!result) {
    return c.json({ error: 'Not found', message: 'Customer not found' }, 404);
  }

  return c.json(result);
});

/**
 * DELETE /api/customers/:id - Delete customer
 */
app.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Invalidate cache first
  const feedService = new FeedService(c.env);
  await feedService.invalidateCustomerCache(Number(id));

  const result = await c.env.DB.prepare('DELETE FROM customers WHERE id = ?')
    .bind(id)
    .run();

  if (result.changes === 0) {
    return c.json({ error: 'Not found', message: 'Customer not found' }, 404);
  }

  return c.json({ success: true });
});

/**
 * PUT /api/customers/:id/selections - Update property selections for customer
 */
app.put('/:id/selections', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<UpdateSelectionsRequest>();

  if (!body.feed_id || !Array.isArray(body.property_ids)) {
    return c.json(
      { error: 'Validation', message: 'feed_id and property_ids are required' },
      400
    );
  }

  // Verify customer exists
  const customer = await c.env.DB.prepare(
    'SELECT id FROM customers WHERE id = ?'
  )
    .bind(id)
    .first();

  if (!customer) {
    return c.json({ error: 'Not found', message: 'Customer not found' }, 404);
  }

  // Delete existing selections for this feed
  await c.env.DB.prepare(
    'DELETE FROM customer_selections WHERE customer_id = ? AND feed_id = ?'
  )
    .bind(id, body.feed_id)
    .run();

  // Insert new selections
  if (body.property_ids.length > 0) {
    const placeholders = body.property_ids.map(() => '(?, ?, ?)').join(', ');
    const values = body.property_ids.flatMap((propId) => [id, body.feed_id, propId]);

    await c.env.DB.prepare(
      `INSERT INTO customer_selections (customer_id, feed_id, property_id) VALUES ${placeholders}`
    )
      .bind(...values)
      .run();
  }

  // Invalidate cache
  const feedService = new FeedService(c.env);
  await feedService.invalidateCustomerCache(Number(id));

  return c.json({ success: true, count: body.property_ids.length });
});

/**
 * GET /api/customers/:id/selections/:feedId - Get selections for a specific feed
 */
app.get('/:id/selections/:feedId', async (c) => {
  const customerId = c.req.param('id');
  const feedId = c.req.param('feedId');

  const selections = await c.env.DB.prepare(
    'SELECT property_id FROM customer_selections WHERE customer_id = ? AND feed_id = ?'
  )
    .bind(customerId, feedId)
    .all<{ property_id: string }>();

  return c.json({
    customer_id: Number(customerId),
    feed_id: Number(feedId),
    property_ids: (selections.results || []).map((s) => s.property_id),
  });
});

export default app;
