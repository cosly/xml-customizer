import type { D1Database } from '@cloudflare/workers-types';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  is_super_admin: boolean;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyStats {
  id: number;
  email: string;
  name: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  last_login_at: string | null;
  created_at: string;
  feed_count: number;
  customer_count: number;
  selection_count: number;
  property_count: number;
}

export interface CompanyDetail extends CompanyStats {
  customers: Array<{
    id: number;
    name: string;
    email: string | null;
    hash_id: string;
    selection_count: number;
    created_at: string;
  }>;
  feeds: Array<{
    id: number;
    name: string;
    url: string;
    property_count: number;
    last_fetched_at: string | null;
    created_at: string;
  }>;
  recent_activity: Array<{
    type: string;
    description: string;
    created_at: string;
  }>;
}

export interface DashboardStats {
  total_companies: number;
  active_companies: number;
  blocked_companies: number;
  total_feeds: number;
  total_customers: number;
  total_selections: number;
  total_properties: number;
  new_companies_today: number;
  new_companies_week: number;
  new_companies_month: number;
  active_today: number;
  active_week: number;
}

export interface ActivityLogEntry {
  id: number;
  admin_id: number;
  admin_name: string;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: number | null;
  target_name: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface CompanyListFilters {
  search?: string;
  status?: 'all' | 'active' | 'blocked';
  sort_by?: 'name' | 'created_at' | 'last_login_at' | 'customer_count' | 'feed_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class AdminService {
  constructor(private db: D1Database) {}

  /**
   * Check if a user is a super admin
   */
  async isSuperAdmin(userId: number): Promise<boolean> {
    const result = await this.db
      .prepare('SELECT is_super_admin FROM users WHERE id = ?')
      .bind(userId)
      .first<{ is_super_admin: number }>();

    return result?.is_super_admin === 1;
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total companies (excluding super admins)
    const totalCompanies = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0')
      .first<{ count: number }>();

    // Active companies (not blocked)
    const activeCompanies = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND is_blocked = 0')
      .first<{ count: number }>();

    // Blocked companies
    const blockedCompanies = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND is_blocked = 1')
      .first<{ count: number }>();

    // Total feeds
    const totalFeeds = await this.db
      .prepare('SELECT COUNT(*) as count FROM source_feeds')
      .first<{ count: number }>();

    // Total customers
    const totalCustomers = await this.db
      .prepare('SELECT COUNT(*) as count FROM customers')
      .first<{ count: number }>();

    // Total selections
    const totalSelections = await this.db
      .prepare('SELECT COUNT(*) as count FROM customer_selections')
      .first<{ count: number }>();

    // Total properties
    const totalProperties = await this.db
      .prepare('SELECT COALESCE(SUM(property_count), 0) as count FROM source_feeds')
      .first<{ count: number }>();

    // New companies today
    const newToday = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND created_at >= ?')
      .bind(todayStart)
      .first<{ count: number }>();

    // New companies this week
    const newWeek = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND created_at >= ?')
      .bind(weekAgo)
      .first<{ count: number }>();

    // New companies this month
    const newMonth = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND created_at >= ?')
      .bind(monthAgo)
      .first<{ count: number }>();

    // Active today (logged in)
    const activeToday = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND last_login_at >= ?')
      .bind(todayStart)
      .first<{ count: number }>();

    // Active this week
    const activeWeek = await this.db
      .prepare('SELECT COUNT(*) as count FROM users WHERE is_super_admin = 0 AND last_login_at >= ?')
      .bind(weekAgo)
      .first<{ count: number }>();

    return {
      total_companies: totalCompanies?.count || 0,
      active_companies: activeCompanies?.count || 0,
      blocked_companies: blockedCompanies?.count || 0,
      total_feeds: totalFeeds?.count || 0,
      total_customers: totalCustomers?.count || 0,
      total_selections: totalSelections?.count || 0,
      total_properties: totalProperties?.count || 0,
      new_companies_today: newToday?.count || 0,
      new_companies_week: newWeek?.count || 0,
      new_companies_month: newMonth?.count || 0,
      active_today: activeToday?.count || 0,
      active_week: activeWeek?.count || 0,
    };
  }

  /**
   * Get list of all companies with stats
   */
  async getCompanies(filters: CompanyListFilters = {}): Promise<{ companies: CompanyStats[]; total: number }> {
    const {
      search = '',
      status = 'all',
      sort_by = 'created_at',
      sort_order = 'desc',
      limit = 50,
      offset = 0,
    } = filters;

    // Build WHERE clause
    const conditions: string[] = ['u.is_super_admin = 0'];
    const bindings: (string | number)[] = [];

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      bindings.push(`%${search}%`, `%${search}%`);
    }

    if (status === 'active') {
      conditions.push('u.is_blocked = 0');
    } else if (status === 'blocked') {
      conditions.push('u.is_blocked = 1');
    }

    const whereClause = conditions.join(' AND ');

    // Valid sort columns
    const validSortColumns: Record<string, string> = {
      name: 'u.name',
      created_at: 'u.created_at',
      last_login_at: 'u.last_login_at',
      customer_count: 'customer_count',
      feed_count: 'feed_count',
    };
    const sortColumn = validSortColumns[sort_by] || 'u.created_at';
    const sortDir = sort_order === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`;
    const countStmt = this.db.prepare(countQuery);
    const countResult = await (bindings.length > 0
      ? countStmt.bind(...bindings)
      : countStmt
    ).first<{ total: number }>();

    // Get companies with stats
    const query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.is_blocked,
        u.blocked_at,
        u.blocked_reason,
        u.last_login_at,
        u.created_at,
        COALESCE(f.feed_count, 0) as feed_count,
        COALESCE(f.property_count, 0) as property_count,
        COALESCE(c.customer_count, 0) as customer_count,
        COALESCE(s.selection_count, 0) as selection_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as feed_count, COALESCE(SUM(property_count), 0) as property_count
        FROM source_feeds
        GROUP BY user_id
      ) f ON u.id = f.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as customer_count
        FROM customers
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT cu.user_id, COUNT(*) as selection_count
        FROM customer_selections cs
        JOIN customers cu ON cs.customer_id = cu.id
        GROUP BY cu.user_id
      ) s ON u.id = s.user_id
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const queryBindings = [...bindings, limit, offset];
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...queryBindings).all<CompanyStats>();

    return {
      companies: result.results.map(company => ({
        ...company,
        is_blocked: Boolean(company.is_blocked),
      })),
      total: countResult?.total || 0,
    };
  }

  /**
   * Get detailed information about a company
   */
  async getCompanyDetail(companyId: number): Promise<CompanyDetail | null> {
    // Get company info with stats
    const company = await this.db.prepare(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.is_blocked,
        u.blocked_at,
        u.blocked_reason,
        u.last_login_at,
        u.created_at,
        COALESCE(f.feed_count, 0) as feed_count,
        COALESCE(f.property_count, 0) as property_count,
        COALESCE(c.customer_count, 0) as customer_count,
        COALESCE(s.selection_count, 0) as selection_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as feed_count, COALESCE(SUM(property_count), 0) as property_count
        FROM source_feeds
        GROUP BY user_id
      ) f ON u.id = f.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as customer_count
        FROM customers
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT cu.user_id, COUNT(*) as selection_count
        FROM customer_selections cs
        JOIN customers cu ON cs.customer_id = cu.id
        GROUP BY cu.user_id
      ) s ON u.id = s.user_id
      WHERE u.id = ? AND u.is_super_admin = 0
    `).bind(companyId).first<CompanyStats>();

    if (!company) {
      return null;
    }

    // Get customers (employees)
    const customersResult = await this.db.prepare(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.hash_id,
        c.created_at,
        COALESCE(cs.selection_count, 0) as selection_count
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as selection_count
        FROM customer_selections
        GROUP BY customer_id
      ) cs ON c.id = cs.customer_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).bind(companyId).all<{
      id: number;
      name: string;
      email: string | null;
      hash_id: string;
      selection_count: number;
      created_at: string;
    }>();

    // Get feeds
    const feedsResult = await this.db.prepare(`
      SELECT
        id,
        name,
        url,
        property_count,
        last_fetched_at,
        created_at
      FROM source_feeds
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(companyId).all<{
      id: number;
      name: string;
      url: string;
      property_count: number;
      last_fetched_at: string | null;
      created_at: string;
    }>();

    // Build recent activity from various tables
    const recentActivity: Array<{ type: string; description: string; created_at: string }> = [];

    // Recent customers
    customersResult.results.slice(0, 5).forEach(customer => {
      recentActivity.push({
        type: 'customer_created',
        description: `Klant "${customer.name}" aangemaakt`,
        created_at: customer.created_at,
      });
    });

    // Recent feeds
    feedsResult.results.slice(0, 5).forEach(feed => {
      recentActivity.push({
        type: 'feed_created',
        description: `Feed "${feed.name}" aangemaakt`,
        created_at: feed.created_at,
      });
    });

    // Sort activity by date
    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      ...company,
      is_blocked: Boolean(company.is_blocked),
      customers: customersResult.results,
      feeds: feedsResult.results,
      recent_activity: recentActivity.slice(0, 10),
    };
  }

  /**
   * Block a company
   */
  async blockCompany(companyId: number, adminId: number, reason?: string): Promise<boolean> {
    const now = new Date().toISOString();

    // Update company
    const result = await this.db
      .prepare('UPDATE users SET is_blocked = 1, blocked_at = ?, blocked_reason = ? WHERE id = ? AND is_super_admin = 0')
      .bind(now, reason || null, companyId)
      .run();

    if (result.meta.changes === 0) {
      return false;
    }

    // Log activity
    await this.logActivity(adminId, 'block_company', 'user', companyId, { reason });

    // Invalidate all sessions for this user
    await this.db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(companyId)
      .run();

    return true;
  }

  /**
   * Unblock a company
   */
  async unblockCompany(companyId: number, adminId: number): Promise<boolean> {
    const result = await this.db
      .prepare('UPDATE users SET is_blocked = 0, blocked_at = NULL, blocked_reason = NULL WHERE id = ? AND is_super_admin = 0')
      .bind(companyId)
      .run();

    if (result.meta.changes === 0) {
      return false;
    }

    // Log activity
    await this.logActivity(adminId, 'unblock_company', 'user', companyId);

    return true;
  }

  /**
   * Log admin activity
   */
  async logActivity(
    adminId: number,
    action: string,
    targetType?: string,
    targetId?: number,
    details?: Record<string, unknown>,
    ipAddress?: string
  ): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO admin_activity_log (admin_id, action, target_type, target_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        adminId,
        action,
        targetType || null,
        targetId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null
      )
      .run();
  }

  /**
   * Get activity log
   */
  async getActivityLog(filters: {
    admin_id?: number;
    action?: string;
    target_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ entries: ActivityLogEntry[]; total: number }> {
    const { admin_id, action, target_type, limit = 50, offset = 0 } = filters;

    const conditions: string[] = ['1=1'];
    const bindings: (string | number)[] = [];

    if (admin_id) {
      conditions.push('al.admin_id = ?');
      bindings.push(admin_id);
    }

    if (action) {
      conditions.push('al.action = ?');
      bindings.push(action);
    }

    if (target_type) {
      conditions.push('al.target_type = ?');
      bindings.push(target_type);
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM admin_activity_log al WHERE ${whereClause}`;
    const countStmt = this.db.prepare(countQuery);
    const countResult = await (bindings.length > 0
      ? countStmt.bind(...bindings)
      : countStmt
    ).first<{ total: number }>();

    // Get activity entries with admin info and target name
    const query = `
      SELECT
        al.id,
        al.admin_id,
        u.name as admin_name,
        u.email as admin_email,
        al.action,
        al.target_type,
        al.target_id,
        CASE
          WHEN al.target_type = 'user' THEN (SELECT name FROM users WHERE id = al.target_id)
          WHEN al.target_type = 'customer' THEN (SELECT name FROM customers WHERE id = al.target_id)
          WHEN al.target_type = 'feed' THEN (SELECT name FROM source_feeds WHERE id = al.target_id)
          ELSE NULL
        END as target_name,
        al.details,
        al.ip_address,
        al.created_at
      FROM admin_activity_log al
      JOIN users u ON al.admin_id = u.id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const queryBindings = [...bindings, limit, offset];
    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...queryBindings).all<ActivityLogEntry>();

    return {
      entries: result.results,
      total: countResult?.total || 0,
    };
  }

  /**
   * Get top companies by various metrics
   */
  async getTopCompanies(metric: 'customers' | 'feeds' | 'selections' | 'properties', limit: number = 10): Promise<CompanyStats[]> {
    let orderBy: string;
    switch (metric) {
      case 'customers':
        orderBy = 'customer_count DESC';
        break;
      case 'feeds':
        orderBy = 'feed_count DESC';
        break;
      case 'selections':
        orderBy = 'selection_count DESC';
        break;
      case 'properties':
        orderBy = 'property_count DESC';
        break;
      default:
        orderBy = 'customer_count DESC';
    }

    const query = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.is_blocked,
        u.blocked_at,
        u.blocked_reason,
        u.last_login_at,
        u.created_at,
        COALESCE(f.feed_count, 0) as feed_count,
        COALESCE(f.property_count, 0) as property_count,
        COALESCE(c.customer_count, 0) as customer_count,
        COALESCE(s.selection_count, 0) as selection_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) as feed_count, COALESCE(SUM(property_count), 0) as property_count
        FROM source_feeds
        GROUP BY user_id
      ) f ON u.id = f.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) as customer_count
        FROM customers
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT cu.user_id, COUNT(*) as selection_count
        FROM customer_selections cs
        JOIN customers cu ON cs.customer_id = cu.id
        GROUP BY cu.user_id
      ) s ON u.id = s.user_id
      WHERE u.is_super_admin = 0
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    const result = await this.db.prepare(query).bind(limit).all<CompanyStats>();

    return result.results.map(company => ({
      ...company,
      is_blocked: Boolean(company.is_blocked),
    }));
  }

  /**
   * Get growth statistics over time
   */
  async getGrowthStats(days: number = 30): Promise<Array<{ date: string; new_companies: number; new_customers: number; new_feeds: number }>> {
    const results: Array<{ date: string; new_companies: number; new_customers: number; new_feeds: number }> = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDateStr = new Date(date.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [companies, customers, feeds] = await Promise.all([
        this.db.prepare(`
          SELECT COUNT(*) as count FROM users
          WHERE is_super_admin = 0 AND date(created_at) = ?
        `).bind(dateStr).first<{ count: number }>(),
        this.db.prepare(`
          SELECT COUNT(*) as count FROM customers
          WHERE date(created_at) = ?
        `).bind(dateStr).first<{ count: number }>(),
        this.db.prepare(`
          SELECT COUNT(*) as count FROM source_feeds
          WHERE date(created_at) = ?
        `).bind(dateStr).first<{ count: number }>(),
      ]);

      results.push({
        date: dateStr,
        new_companies: companies?.count || 0,
        new_customers: customers?.count || 0,
        new_feeds: feeds?.count || 0,
      });
    }

    return results;
  }
}
