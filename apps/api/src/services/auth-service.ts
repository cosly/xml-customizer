import type { D1Database } from '@cloudflare/workers-types';

export interface User {
  id: number;
  email: string;
  name: string;
  is_super_admin?: boolean;
  is_blocked?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  used_at: string | null;
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
      .prepare('SELECT id, email, name, password_hash, is_super_admin, is_blocked, created_at, updated_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<User & { password_hash: string; is_super_admin: number; is_blocked: number }>();

    if (!user) {
      throw new Error('Ongeldige inloggegevens');
    }

    // Check if user is blocked
    if (user.is_blocked) {
      throw new Error('Account is geblokkeerd. Neem contact op met de beheerder.');
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      throw new Error('Ongeldige inloggegevens');
    }

    // Update last login timestamp
    const now = new Date().toISOString();
    await this.db
      .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
      .bind(now, user.id)
      .run();

    // Create session (expires in 7 days)
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await this.db
      .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(sessionId, user.id, expiresAt)
      .run();

    const { password_hash, is_blocked, ...userWithoutPassword } = user;

    return {
      user: {
        ...userWithoutPassword,
        is_super_admin: Boolean(user.is_super_admin),
        last_login_at: now,
      },
      session: {
        id: sessionId,
        user_id: user.id,
        expires_at: expiresAt,
        created_at: now,
      },
    };
  }

  async validateSession(sessionId: string): Promise<User | null> {
    const result = await this.db
      .prepare(`
        SELECT u.id, u.email, u.name, u.is_super_admin, u.is_blocked, u.last_login_at, u.created_at, u.updated_at, s.expires_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
      `)
      .bind(sessionId)
      .first<User & { expires_at: string; is_super_admin: number; is_blocked: number }>();

    if (!result) {
      return null;
    }

    // Check if session expired
    if (new Date(result.expires_at) < new Date()) {
      await this.logout(sessionId);
      return null;
    }

    // Check if user is blocked
    if (result.is_blocked) {
      await this.logout(sessionId);
      return null;
    }

    const { expires_at, is_super_admin, is_blocked, ...user } = result;
    return {
      ...user,
      is_super_admin: Boolean(is_super_admin),
    };
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

  // Generate password reset token
  async createPasswordResetToken(email: string): Promise<{ token: string; user: User } | null> {
    const user = await this.db
      .prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<User>();

    if (!user) {
      return null;
    }

    // Invalidate existing tokens for this user
    await this.db
      .prepare('DELETE FROM password_reset_tokens WHERE user_id = ?')
      .bind(user.id)
      .run();

    // Generate token (64 bytes = 128 hex chars)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(64));
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await this.db
      .prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
      .bind(user.id, token, expiresAt)
      .run();

    return { token, user };
  }

  // Validate and use password reset token
  async resetPassword(token: string, newPassword: string): Promise<User | null> {
    // Validate password
    if (newPassword.length < 8) {
      throw new Error('Wachtwoord moet minimaal 8 karakters zijn');
    }

    const resetToken = await this.db
      .prepare(`
        SELECT prt.*, u.id as uid, u.email, u.name, u.created_at, u.updated_at
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = ? AND prt.used_at IS NULL
      `)
      .bind(token)
      .first<PasswordResetToken & { uid: number; email: string; name: string }>();

    if (!resetToken) {
      throw new Error('Ongeldige of verlopen reset link');
    }

    // Check if token expired
    if (new Date(resetToken.expires_at) < new Date()) {
      throw new Error('Reset link is verlopen');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    await this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(passwordHash, resetToken.user_id)
      .run();

    // Mark token as used
    await this.db
      .prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(resetToken.id)
      .run();

    // Logout all sessions for security
    await this.logoutAll(resetToken.user_id);

    return {
      id: resetToken.uid,
      email: resetToken.email,
      name: resetToken.name,
      created_at: resetToken.created_at,
      updated_at: new Date().toISOString(),
    };
  }

  // Get user by email (for password reset)
  async getUserByEmail(email: string): Promise<User | null> {
    return this.db
      .prepare('SELECT id, email, name, created_at, updated_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first<User>();
  }
}
