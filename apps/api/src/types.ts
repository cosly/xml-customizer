import type { D1Database, R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_API_KEY: string;
  CORS_ORIGIN: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export type Variables = {
  isAdmin: boolean;
  user: AuthUser | null;
  sessionId: string | null;
};
