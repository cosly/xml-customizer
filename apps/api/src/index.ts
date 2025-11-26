import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './types';
import { sessionAuth } from './middleware/auth';
import authRoutes from './routes/auth';
import customersRoutes from './routes/customers';
import feedsRoutes from './routes/feeds';
import publicRoutes from './routes/public';
import teamRoutes from './routes/team';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Middleware
app.use('*', logger());
app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      // Allow configured origin and localhost for development
      const allowed = [c.env.CORS_ORIGIN, 'http://localhost:5173', 'http://localhost:4173'];
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-Customer'],
    credentials: true, // Allow cookies
    maxAge: 86400,
  })
);

// Public feed endpoint (no auth required)
// CORS also enabled for public endpoints
app.use(
  '/feed/*',
  cors({
    origin: '*', // Public feeds can be accessed from anywhere
    allowMethods: ['GET', 'OPTIONS'],
    maxAge: 86400,
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'XML Customizer API',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Public routes (no auth)
app.route('/feed', publicRoutes);

// Auth routes (no session required for login/register)
app.route('/api/auth', authRoutes);

// Protected API routes (session required)
app.use('/api/customers/*', sessionAuth);
app.use('/api/feeds/*', sessionAuth);
app.route('/api/customers', customersRoutes);
app.route('/api/feeds', feedsRoutes);

// Team routes (some require auth, some don't - handled in route)
app.route('/api/team', teamRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found', message: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal server error',
      message: err.message || 'An unexpected error occurred',
    },
    500
  );
});

export default app;
