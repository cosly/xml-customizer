import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_API_KEY: string;
  CORS_ORIGIN: string;
  MAILGUN_API_KEY: string;
  MAILGUN_DOMAIN: string;
  EMAIL_FROM: string;
  APP_URL?: string;
}

export type Salutation = 'mr' | 'ms' | 'mrs' | 'mx' | 'dr' | 'prof' | 'other' | null;

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  salutation: Salutation;
  first_name: string | null;
  last_name: string | null;
  preferred_language: string;
  organization_id: number | null;
  created_at: string;
  updated_at: string;
}

export type Variables = {
  isAdmin: boolean;
  user: AuthUser | null;
  sessionId: string | null;
};
