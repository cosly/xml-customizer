import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import type { Env, Variables } from '../types';
import { AuthService } from '../services/auth-service';
import { AdminService } from '../services/admin-service';

/**
 * Middleware to check for admin API key (for backward compatibility)
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

/**
 * Middleware to validate session and set user context
 * Supports both cookie-based sessions and Authorization header
 */
export const sessionAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    // Try to get session from cookie first
    let sessionId = getCookie(c, 'session');

    // Fall back to Authorization header (Bearer token)
    if (!sessionId) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionId = authHeader.slice(7);
      }
    }

    if (!sessionId) {
      c.set('user', null);
      c.set('sessionId', null);
      return c.json({ error: 'Unauthorized', message: 'Niet ingelogd' }, 401);
    }

    const authService = new AuthService(c.env.DB);
    const user = await authService.validateSession(sessionId);

    if (!user) {
      c.set('user', null);
      c.set('sessionId', null);
      return c.json({ error: 'Unauthorized', message: 'Sessie verlopen' }, 401);
    }

    c.set('user', user);
    c.set('sessionId', sessionId);
    await next();
  }
);

/**
 * Optional session middleware - sets user if logged in, but doesn't require it
 */
export const optionalSession = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    let sessionId = getCookie(c, 'session');

    if (!sessionId) {
      const authHeader = c.req.header('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        sessionId = authHeader.slice(7);
      }
    }

    if (sessionId) {
      const authService = new AuthService(c.env.DB);
      const user = await authService.validateSession(sessionId);
      c.set('user', user);
      c.set('sessionId', sessionId);
    } else {
      c.set('user', null);
      c.set('sessionId', null);
    }

    await next();
  }
);

/**
 * Middleware to check if user is a super admin
 * Must be used after sessionAuth middleware
 */
export const superAdminAuth = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'Niet ingelogd' }, 401);
    }

    const adminService = new AdminService(c.env.DB);
    const isSuperAdmin = await adminService.isSuperAdmin(user.id);

    if (!isSuperAdmin) {
      return c.json({ error: 'Forbidden', message: 'Geen toegang - alleen voor super admins' }, 403);
    }

    c.set('isAdmin', true);
    await next();
  }
);
