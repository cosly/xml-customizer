import type { D1Database } from '@cloudflare/workers-types';

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

// Password hashing using Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  // Combine salt and hash for storage
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `${saltB64}:${hashB64}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(':');
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
  const storedHash = atob(hashB64);

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashStr = String.fromCharCode(...new Uint8Array(hash));
  return hashStr === storedHash;
}

// Generate session ID
function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class AuthService {
  constructor(private db: D1Database) {}

  async register(email: string, password: string, name: string): Promise<User> {
    // Check if user exists
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (existing) {
      throw new Error('Email is al in gebruik');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Wachtwoord moet minimaal 8 karakters zijn');
    }

    const passwordHash = await hashPassword(password);

    const result = await this.db
      .prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id, email, name, created_at, updated_at')
      .bind(email.toLowerCase(), passwordHash, name)
      .first<User>();

    if (!result) {
      throw new Error('Registratie mislukt');
    }

    return result;
  }

  async login(email: string, password: string): Promise<{ user: User; session: Session }> {
    const user = await this.db
      .prepare('SELECT id, email, name, password_hash, created_at, updated_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<User & { password_hash: string }>();

    if (!user) {
      throw new Error('Ongeldige inloggegevens');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Ongeldige inloggegevens');
    }

    // Create session (expires in 7 days)
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(sessionId, user.id, expiresAt)
      .run();

    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      session: {
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      },
    };
  }

  async validateSession(sessionId: string): Promise<User | null> {
    const result = await this.db
      .prepare(`
        SELECT u.id, u.email, u.name, u.created_at, u.updated_at, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `)
      .bind(sessionId)
      .first<User & { expires_at: string }>();

    if (!result) {
      return null;
    }

    // Check if session expired
    if (new Date(result.expires_at) < new Date()) {
      await this.logout(sessionId);
      return null;
    }

    const { expires_at, ...user } = result;
    return user;
  }

  async logout(sessionId: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(sessionId)
      .run();
  }

  async logoutAll(userId: number): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(userId)
      .run();
  }

  // Cleanup expired sessions (can be called periodically)
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM sessions WHERE expires_at < datetime('now')")
      .run();
    return result.meta.changes || 0;
  }
}
