import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types';

/**
 * Middleware to check for admin API key
 */
export const adminAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const apiKey = c.req.header('X-API-Key');
    const expectedKey = c.env.ADMIN_API_KEY;

    if (!apiKey || apiKey !== expectedKey) {
      return c.json({ error: 'Unauthorized', message: 'Invalid or missing API key' }, 401);
    }

    c.set('isAdmin', true);
    await next();
  }
);
