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
  created_at: string;
  updated_at: string;
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
