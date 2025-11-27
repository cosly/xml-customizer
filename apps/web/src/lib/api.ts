import type {
  Customer,
  SourceFeed,
  PropertySummary,
  CreateCustomerRequest,
  CreateFeedRequest,
  UpdateSelectionsRequest,
  CustomerWithSelections,
  FeedAnalytics,
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

  analyze: (id: number) => fetchApi<FeedAnalytics>(`/api/feeds/${id}/analyze`),
};

// Get public feed URL
export function getPublicFeedUrl(hashId: string, feedId?: number): string {
  const base = `${API_URL}/feed/${hashId}`;
  return feedId ? `${base}?feed=${feedId}` : base;
}
