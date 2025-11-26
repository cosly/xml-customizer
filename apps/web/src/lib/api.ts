import type {
  Customer,
  SourceFeed,
  PropertySummary,
  CreateCustomerRequest,
  CreateFeedRequest,
  UpdateSelectionsRequest,
  CustomerWithSelections,
  DashboardStats,
  CompanyStats,
  CompanyDetail,
  ActivityLogEntry,
  GrowthDataPoint,
  CheckUpdateResult,
} from '@xml-customizer/shared';

// Auto-detect production vs local development
const API_URL = import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'https://xml-customizer-api.tesorocrm.workers.dev'
    : 'http://localhost:8787');

// User type
export interface User {
  id: number;
  email: string;
  name: string;
  is_super_admin?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Session storage for token (when cookies don't work cross-domain)
let sessionToken: string | null = null;

export function setSessionToken(token: string | null) {
  sessionToken = token;
  if (token) {
    localStorage.setItem('session_token', token);
  } else {
    localStorage.removeItem('session_token');
  }
}

export function getSessionToken(): string | null {
  if (sessionToken) return sessionToken;
  if (typeof window !== 'undefined') {
    sessionToken = localStorage.getItem('session_token');
  }
  return sessionToken;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add session token to Authorization header if available
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for same-origin
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  register: async (email: string, password: string, name: string) => {
    const result = await fetchApi<{ user: User; session: { id: string; expires_at: string } }>(
      '/api/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      }
    );
    // Store session token for cross-domain requests
    setSessionToken(result.session.id);
    return result;
  },

  login: async (email: string, password: string) => {
    const result = await fetchApi<{ user: User; session: { id: string; expires_at: string } }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
    // Store session token for cross-domain requests
    setSessionToken(result.session.id);
    return result;
  },

  logout: async () => {
    try {
      await fetchApi<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setSessionToken(null);
    }
  },

  me: () => fetchApi<{ user: User }>('/api/auth/me'),

  forgotPassword: (email: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, password: string) =>
    fetchApi<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),
};

// Customers API
export const customersApi = {
  list: () => fetchApi<Customer[]>('/api/customers'),

  get: (id: number) => fetchApi<CustomerWithSelections>(`/api/customers/${id}`),

  create: (data: CreateCustomerRequest) =>
    fetchApi<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateCustomerRequest>) =>
    fetchApi<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),

  updateSelections: (id: number, data: UpdateSelectionsRequest) =>
    fetchApi<{ success: boolean; count: number }>(`/api/customers/${id}/selections`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getSelections: (customerId: number, feedId: number) =>
    fetchApi<{ property_ids: string[] }>(
      `/api/customers/${customerId}/selections/${feedId}`
    ),

  shareFeedUrl: (customerId: number, data: { email: string; feedId?: number; message?: string }) =>
    fetchApi<{ success: boolean; message: string }>(`/api/customers/${customerId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Feeds API
export const feedsApi = {
  list: () => fetchApi<SourceFeed[]>('/api/feeds'),

  get: (id: number) => fetchApi<SourceFeed>(`/api/feeds/${id}`),

  create: (data: CreateFeedRequest) =>
    fetchApi<SourceFeed>('/api/feeds', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: number, data: Partial<CreateFeedRequest>) =>
    fetchApi<SourceFeed>(`/api/feeds/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/api/feeds/${id}`, {
      method: 'DELETE',
    }),

  refresh: (id: number) =>
    fetchApi<SourceFeed>(`/api/feeds/${id}/refresh`, {
      method: 'POST',
    }),

  getProperties: (id: number) =>
    fetchApi<PropertySummary[]>(`/api/feeds/${id}/properties`),

  purgeCache: (id: number) =>
    fetchApi<{ success: boolean }>(`/api/feeds/${id}/purge-cache`, {
      method: 'POST',
    }),

  checkForUpdates: (id: number) =>
    fetchApi<CheckUpdateResult>(`/api/feeds/${id}/check-updates`, {
      method: 'POST',
    }),
};

// Get public feed URL
export function getPublicFeedUrl(hashId: string, feedId?: number): string {
  const base = `${API_URL}/feed/${hashId}`;
  return feedId ? `${base}?feed=${feedId}` : base;
}

// Admin API
export const adminApi = {
  getDashboard: () => fetchApi<DashboardStats>('/api/admin/dashboard'),

  getCompanies: (params?: {
    search?: string;
    status?: 'all' | 'active' | 'blocked';
    sort_by?: 'name' | 'created_at' | 'last_login_at' | 'customer_count' | 'feed_count';
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.set('sort_order', params.sort_order);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return fetchApi<{ companies: CompanyStats[]; total: number }>(
      `/api/admin/companies${query ? `?${query}` : ''}`
    );
  },

  getCompany: (id: number) => fetchApi<CompanyDetail>(`/api/admin/companies/${id}`),

  blockCompany: (id: number, reason?: string) =>
    fetchApi<{ success: boolean; message: string }>(`/api/admin/companies/${id}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  unblockCompany: (id: number) =>
    fetchApi<{ success: boolean; message: string }>(`/api/admin/companies/${id}/unblock`, {
      method: 'POST',
    }),

  getActivity: (params?: {
    admin_id?: number;
    action?: string;
    target_type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.admin_id) searchParams.set('admin_id', params.admin_id.toString());
    if (params?.action) searchParams.set('action', params.action);
    if (params?.target_type) searchParams.set('target_type', params.target_type);
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    const query = searchParams.toString();
    return fetchApi<{ entries: ActivityLogEntry[]; total: number }>(
      `/api/admin/activity${query ? `?${query}` : ''}`
    );
  },

  getTopCompanies: (metric: 'customers' | 'feeds' | 'selections' | 'properties', limit?: number) => {
    const searchParams = new URLSearchParams();
    searchParams.set('metric', metric);
    if (limit) searchParams.set('limit', limit.toString());
    return fetchApi<{ companies: CompanyStats[] }>(
      `/api/admin/stats/top-companies?${searchParams.toString()}`
    );
  },

  getGrowthStats: (days?: number) => {
    const searchParams = new URLSearchParams();
    if (days) searchParams.set('days', days.toString());
    return fetchApi<{ growth: GrowthDataPoint[] }>(
      `/api/admin/stats/growth?${searchParams.toString()}`
    );
  },
};
