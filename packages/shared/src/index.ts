// Database models
export interface Customer {
  id: number;
  name: string;
  hash_id: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface SourceFeed {
  id: number;
  name: string;
  url: string; // External URL to fetch XML from
  r2_key?: string; // Cached XML in R2
  property_count: number;
  last_fetched_at?: string;
  source_last_modified?: string; // Last-Modified header from source
  source_etag?: string; // ETag header from source
  source_checked_at?: string; // When we last checked for updates
  update_available?: boolean; // Whether source has newer version
  created_at: string;
  updated_at: string;
}

// Feed update check result
export interface CheckUpdateResult {
  hasUpdate: boolean;
  lastModified: string | null;
  etag: string | null;
  checkedAt: string;
}

export interface CustomerSelection {
  id: number;
  customer_id: number;
  feed_id: number;
  property_id: string; // The <id> from XML
  created_at: string;
}

// API request/response types
export interface CreateCustomerRequest {
  name: string;
  email?: string;
}

export interface CreateFeedRequest {
  name: string;
  url: string;
}

export interface UpdateSelectionsRequest {
  feed_id: number;
  property_ids: string[];
}

// XML Property type (parsed from Kyero XML)
export interface KyeroProperty {
  id: string;
  ref: string;
  date: string;
  price: number;
  currency: string;
  price_freq: string;
  type: string;
  town: string;
  province: string;
  country: string;
  beds: number;
  baths: number;
  pool: number;
  surface_area: {
    built?: number;
    plot?: number;
  };
  energy_rating: {
    consumption: string;
    emissions: string;
  };
  url: Record<string, string>;
  desc: Record<string, string>;
  features: string[];
  images: Array<{ id: string; url: string }>;
  new_build: boolean;
  prime: number;
  email: string;
}

// API response types
export interface PropertySummary {
  id: string;
  ref: string;
  type: string;
  town: string;
  price: number;
  beds: number;
  baths: number;
  image_url?: string;
}

export interface CustomerWithSelections extends Customer {
  selections: Array<{
    feed_id: number;
    feed_name: string;
    property_ids: string[];
  }>;
}

export interface FeedWithProperties extends SourceFeed {
  properties: PropertySummary[];
}

// API Error type
export interface ApiError {
  error: string;
  message: string;
}

// Admin types
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

export interface GrowthDataPoint {
  date: string;
  new_companies: number;
  new_customers: number;
  new_feeds: number;
}
