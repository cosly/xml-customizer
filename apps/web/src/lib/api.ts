import type {
  Customer,
  SourceFeed,
  PropertySummary,
  CreateCustomerRequest,
  CreateFeedRequest,
  UpdateSelectionsRequest,
  CustomerWithSelections,
} from '@xml-customizer/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
const API_KEY = import.meta.env.VITE_API_KEY || 'change-this-in-production';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

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
};

// Get public feed URL
export function getPublicFeedUrl(hashId: string, feedId?: number): string {
  const base = `${API_URL}/feed/${hashId}`;
  return feedId ? `${base}?feed=${feedId}` : base;
}
