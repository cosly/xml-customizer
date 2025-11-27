import type { D1Database } from '@cloudflare/workers-types';
import type { Salutation } from './auth-service';

export interface ProfileUpdateData {
  salutation?: Salutation;
  first_name?: string;
  last_name?: string;
  name?: string;
  preferred_language?: string;
}

export interface EmailChangeToken {
  id: number;
  user_id: number;
  new_email: string;
  token: string;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
}

// Generate secure random token
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class ProfileService {
  constructor(private db: D1Database) {}

  async updateProfile(userId: number, data: ProfileUpdateData): Promise<boolean> {
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (data.salutation !== undefined) {
      updates.push('salutation = ?');
      values.push(data.salutation);
    }

    if (data.first_name !== undefined) {
      updates.push('first_name = ?');
      values.push(data.first_name || null);
    }

    if (data.last_name !== undefined) {
      updates.push('last_name = ?');
      values.push(data.last_name || null);
    }

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.preferred_language !== undefined) {
      updates.push('preferred_language = ?');
      values.push(data.preferred_language);
    }

    if (updates.length === 0) {
      return false;
    }

    updates.push('updated_at = datetime("now")');
    values.push(userId.toString());

    const result = await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values.slice(0, -1), userId)
      .run();

    return (result.meta.changes || 0) > 0;
  }

  async requestEmailChange(userId: number, newEmail: string): Promise<{ token: string; expiresAt: string } | null> {
    // Check if email is already in use
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(newEmail.toLowerCase(), userId)
      .first();

    if (existing) {
      throw new Error('Dit emailadres is al in gebruik');
    }

    // Invalidate any existing email change tokens for this user
    await this.db
      .prepare('DELETE FROM email_change_tokens WHERE user_id = ?')
      .bind(userId)
      .run();

    const token = generateToken();
    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await this.db
      .prepare(`
        INSERT INTO email_change_tokens (user_id, new_email, token, expires_at)
        VALUES (?, ?, ?, ?)
      `)
      .bind(userId, newEmail.toLowerCase(), token, expiresAt)
      .run();

    return { token, expiresAt };
  }

  async verifyEmailChange(token: string): Promise<{ userId: number; oldEmail: string; newEmail: string } | null> {
    // Get the token and user info
    const tokenInfo = await this.db
      .prepare(`
        SELECT ect.*, u.email as old_email
        FROM email_change_tokens ect
        JOIN users u ON ect.user_id = u.id
        WHERE ect.token = ? AND ect.verified_at IS NULL
      `)
      .bind(token)
      .first<EmailChangeToken & { old_email: string }>();

    if (!tokenInfo) {
      throw new Error('Ongeldige of verlopen verificatie link');
    }

    // Check if token expired
    if (new Date(tokenInfo.expires_at) < new Date()) {
      throw new Error('Verificatie link is verlopen');
    }

    // Check if new email is still available
    const existing = await this.db
      .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .bind(tokenInfo.new_email, tokenInfo.user_id)
      .first();

    if (existing) {
      throw new Error('Dit emailadres is inmiddels door iemand anders geregistreerd');
    }

    // Update user email
    await this.db
      .prepare('UPDATE users SET email = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(tokenInfo.new_email, tokenInfo.user_id)
      .run();

    // Mark token as verified
    await this.db
      .prepare('UPDATE email_change_tokens SET verified_at = datetime("now") WHERE id = ?')
      .bind(tokenInfo.id)
      .run();

    return {
      userId: tokenInfo.user_id,
      oldEmail: tokenInfo.old_email,
      newEmail: tokenInfo.new_email,
    };
  }

  async getPendingEmailChange(userId: number): Promise<{ newEmail: string; expiresAt: string } | null> {
    const pending = await this.db
      .prepare(`
        SELECT new_email, expires_at
        FROM email_change_tokens
        WHERE user_id = ? AND verified_at IS NULL AND expires_at > datetime('now')
      `)
      .bind(userId)
      .first<{ new_email: string; expires_at: string }>();

    if (!pending) {
      return null;
    }

    return {
      newEmail: pending.new_email,
      expiresAt: pending.expires_at,
    };
  }

  async cancelEmailChange(userId: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM email_change_tokens WHERE user_id = ? AND verified_at IS NULL')
      .bind(userId)
      .run();

    return (result.meta.changes || 0) > 0;
  }
}
