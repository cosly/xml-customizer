import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { AdminService } from '../services/admin-service';

const adminRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/admin/dashboard
 * Get dashboard statistics
 */
adminRoutes.get('/dashboard', async (c) => {
  const adminService = new AdminService(c.env.DB);
  const user = c.get('user')!;

  // Log activity
  await adminService.logActivity(user.id, 'view_dashboard');

  const stats = await adminService.getDashboardStats();
  return c.json(stats);
});

/**
 * GET /api/admin/companies
 * Get list of all companies with filtering and pagination
 */
adminRoutes.get('/companies', async (c) => {
  const adminService = new AdminService(c.env.DB);

  const search = c.req.query('search') || '';
  const status = (c.req.query('status') || 'all') as 'all' | 'active' | 'blocked';
  const sort_by = (c.req.query('sort_by') || 'created_at') as 'name' | 'created_at' | 'last_login_at' | 'customer_count' | 'feed_count';
  const sort_order = (c.req.query('sort_order') || 'desc') as 'asc' | 'desc';
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await adminService.getCompanies({
    search,
    status,
    sort_by,
    sort_order,
    limit,
    offset,
  });

  return c.json(result);
});

/**
 * GET /api/admin/companies/:id
 * Get detailed information about a company
 */
adminRoutes.get('/companies/:id', async (c) => {
  const adminService = new AdminService(c.env.DB);
  const user = c.get('user')!;
  const companyId = parseInt(c.req.param('id'), 10);

  if (isNaN(companyId)) {
    return c.json({ error: 'Invalid ID', message: 'Ongeldig bedrijf ID' }, 400);
  }

  const company = await adminService.getCompanyDetail(companyId);

  if (!company) {
    return c.json({ error: 'Not found', message: 'Bedrijf niet gevonden' }, 404);
  }

  // Log activity
  await adminService.logActivity(user.id, 'view_company', 'user', companyId);

  return c.json(company);
});

/**
 * POST /api/admin/companies/:id/block
 * Block a company
 */
adminRoutes.post('/companies/:id/block', async (c) => {
  const adminService = new AdminService(c.env.DB);
  const user = c.get('user')!;
  const companyId = parseInt(c.req.param('id'), 10);

  if (isNaN(companyId)) {
    return c.json({ error: 'Invalid ID', message: 'Ongeldig bedrijf ID' }, 400);
  }

  const body = await c.req.json<{ reason?: string }>().catch(() => ({}));

  const success = await adminService.blockCompany(companyId, user.id, body.reason);

  if (!success) {
    return c.json({ error: 'Not found', message: 'Bedrijf niet gevonden of al geblokkeerd' }, 404);
  }

  return c.json({ success: true, message: 'Bedrijf geblokkeerd' });
});

/**
 * POST /api/admin/companies/:id/unblock
 * Unblock a company
 */
adminRoutes.post('/companies/:id/unblock', async (c) => {
  const adminService = new AdminService(c.env.DB);
  const user = c.get('user')!;
  const companyId = parseInt(c.req.param('id'), 10);

  if (isNaN(companyId)) {
    return c.json({ error: 'Invalid ID', message: 'Ongeldig bedrijf ID' }, 400);
  }

  const success = await adminService.unblockCompany(companyId, user.id);

  if (!success) {
    return c.json({ error: 'Not found', message: 'Bedrijf niet gevonden of niet geblokkeerd' }, 404);
  }

  return c.json({ success: true, message: 'Bedrijf gedeblokkeerd' });
});

/**
 * GET /api/admin/activity
 * Get activity log
 */
adminRoutes.get('/activity', async (c) => {
  const adminService = new AdminService(c.env.DB);

  const admin_id = c.req.query('admin_id') ? parseInt(c.req.query('admin_id')!, 10) : undefined;
  const action = c.req.query('action');
  const target_type = c.req.query('target_type');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  const result = await adminService.getActivityLog({
    admin_id,
    action,
    target_type,
    limit,
    offset,
  });

  return c.json(result);
});

/**
 * GET /api/admin/stats/top-companies
 * Get top companies by metric
 */
adminRoutes.get('/stats/top-companies', async (c) => {
  const adminService = new AdminService(c.env.DB);

  const metric = (c.req.query('metric') || 'customers') as 'customers' | 'feeds' | 'selections' | 'properties';
  const limit = parseInt(c.req.query('limit') || '10', 10);

  const companies = await adminService.getTopCompanies(metric, limit);

  return c.json({ companies });
});

/**
 * GET /api/admin/stats/growth
 * Get growth statistics over time
 */
adminRoutes.get('/stats/growth', async (c) => {
  const adminService = new AdminService(c.env.DB);

  const days = parseInt(c.req.query('days') || '30', 10);
  const growth = await adminService.getGrowthStats(days);

  return c.json({ growth });
});

export default adminRoutes;
