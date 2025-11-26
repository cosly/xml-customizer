import type { D1Database } from '@cloudflare/workers-types';

export interface Invitation {
  id: number;
  organization_id: number;
  email: string;
  token: string;
  invited_by: number;
  role: 'admin' | 'member';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface InvitationWithDetails extends Invitation {
  organization_name: string;
  invited_by_name: string;
}

// Generate secure random token
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export class InvitationService {
  constructor(private db: D1Database) {}

  async createInvitation(
    organizationId: number,
    email: string,
    invitedBy: number,
    role: 'admin' | 'member' = 'member'
  ): Promise<Invitation> {
    // Check if user is already a member
    const existingMember = await this.db
      .prepare(`
        SELECT u.id FROM users u
        JOIN organization_members om ON u.id = om.user_id
        WHERE u.email = ? AND om.organization_id = ?
      `)
      .bind(email.toLowerCase(), organizationId)
      .first();

    if (existingMember) {
      throw new Error('Deze gebruiker is al lid van je organisatie');
    }

    // Check for existing pending invitation
    const existingInvite = await this.db
      .prepare(`
        SELECT id FROM invitations
        WHERE email = ? AND organization_id = ? AND accepted_at IS NULL AND expires_at > datetime('now')
      `)
      .bind(email.toLowerCase(), organizationId)
      .first();

    if (existingInvite) {
      throw new Error('Er is al een uitnodiging verzonden naar dit email adres');
    }

    const token = generateToken();
    // Invitation expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await this.db
      .prepare(`
        INSERT INTO invitations (organization_id, email, token, invited_by, role, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(organizationId, email.toLowerCase(), token, invitedBy, role, expiresAt)
      .first<Invitation>();

    if (!result) {
      throw new Error('Uitnodiging maken mislukt');
    }

    return result;
  }

  async getInvitationByToken(token: string): Promise<InvitationWithDetails | null> {
    return this.db
      .prepare(`
        SELECT
          i.*,
          o.name as organization_name,
          u.name as invited_by_name
        FROM invitations i
        JOIN organizations o ON i.organization_id = o.id
        JOIN users u ON i.invited_by = u.id
        WHERE i.token = ?
      `)
      .bind(token)
      .first<InvitationWithDetails>();
  }

  async validateInvitation(token: string): Promise<InvitationWithDetails | null> {
    const invitation = await this.getInvitationByToken(token);

    if (!invitation) {
      return null;
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return null;
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return null;
    }

    return invitation;
  }

  async getPendingInvitations(organizationId: number): Promise<Array<Invitation & { invited_by_name: string }>> {
    const result = await this.db
      .prepare(`
        SELECT i.*, u.name as invited_by_name
        FROM invitations i
        JOIN users u ON i.invited_by = u.id
        WHERE i.organization_id = ? AND i.accepted_at IS NULL AND i.expires_at > datetime('now')
        ORDER BY i.created_at DESC
      `)
      .bind(organizationId)
      .all<Invitation & { invited_by_name: string }>();

    return result.results || [];
  }

  async cancelInvitation(invitationId: number, organizationId: number): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM invitations WHERE id = ? AND organization_id = ? AND accepted_at IS NULL')
      .bind(invitationId, organizationId)
      .run();

    return (result.meta.changes || 0) > 0;
  }

  async resendInvitation(invitationId: number, organizationId: number): Promise<Invitation | null> {
    // Update expiration date
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const result = await this.db
      .prepare(`
        UPDATE invitations
        SET expires_at = ?
        WHERE id = ? AND organization_id = ? AND accepted_at IS NULL
        RETURNING *
      `)
      .bind(expiresAt, invitationId, organizationId)
      .first<Invitation>();

    return result;
  }

  // Clean up expired invitations
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await this.db
      .prepare("DELETE FROM invitations WHERE expires_at < datetime('now') AND accepted_at IS NULL")
      .run();
    return result.meta.changes || 0;
  }
}
