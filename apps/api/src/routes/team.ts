import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { AuthService } from '../services/auth-service';
import { InvitationService } from '../services/invitation-service';
import { EmailService } from '../services/email-service';
import { sessionAuth } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get current user's organization and team members
app.get('/', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  const authService = new AuthService(c.env.DB);
  const orgData = await authService.getUserOrganization(user.id);

  if (!orgData) {
    return c.json({ error: 'Organisatie niet gevonden' }, 404);
  }

  const invitationService = new InvitationService(c.env.DB);
  const pendingInvitations = await invitationService.getPendingInvitations(user.organization_id);

  return c.json({
    organization: orgData.organization,
    role: orgData.role,
    members: orgData.members,
    pendingInvitations,
  });
});

// Update organization name
app.put('/', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  const authService = new AuthService(c.env.DB);

  // Check if user is owner or admin
  const canManage = await authService.canUserInvite(user.id, user.organization_id);
  if (!canManage) {
    return c.json({ error: 'Je hebt geen rechten om de organisatie te wijzigen' }, 403);
  }

  const { name } = await c.req.json();

  if (!name || name.trim().length === 0) {
    return c.json({ error: 'Organisatienaam is verplicht' }, 400);
  }

  await c.env.DB
    .prepare('UPDATE organizations SET name = ?, updated_at = datetime("now") WHERE id = ?')
    .bind(name.trim(), user.organization_id)
    .run();

  return c.json({ success: true });
});

// Send invitation
app.post('/invitations', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  const authService = new AuthService(c.env.DB);

  // Check if user can invite
  const canInvite = await authService.canUserInvite(user.id, user.organization_id);
  if (!canInvite) {
    return c.json({ error: 'Je hebt geen rechten om gebruikers uit te nodigen' }, 403);
  }

  const { email, role = 'member', salutation, first_name, last_name } = await c.req.json();

  if (!email) {
    return c.json({ error: 'Email is verplicht' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: 'Ongeldig email adres' }, 400);
  }

  // Validate role
  if (role !== 'admin' && role !== 'member') {
    return c.json({ error: 'Ongeldige rol' }, 400);
  }

  // Validate salutation if provided
  const validSalutations = ['mr', 'ms', 'mrs', 'mx', 'dr', 'prof', 'other', null, undefined];
  if (!validSalutations.includes(salutation)) {
    return c.json({ error: 'Ongeldige aanhef' }, 400);
  }

  try {
    const invitationService = new InvitationService(c.env.DB);
    const invitation = await invitationService.createInvitation(
      user.organization_id,
      email,
      user.id,
      role,
      { salutation, first_name, last_name }
    );

    // Get organization name for email
    const org = await c.env.DB
      .prepare('SELECT name FROM organizations WHERE id = ?')
      .bind(user.organization_id)
      .first<{ name: string }>();

    // Send invitation email
    const emailService = new EmailService(c.env);
    const origin = c.req.header('origin') || c.env.APP_URL || 'http://localhost:5173';
    const inviteUrl = `${origin}/invite?token=${invitation.token}`;

    console.log('Sending invitation email to:', email);
    console.log('Invite URL:', inviteUrl);
    console.log('MAILGUN_DOMAIN configured:', !!c.env.MAILGUN_DOMAIN);
    console.log('MAILGUN_API_KEY configured:', !!c.env.MAILGUN_API_KEY);

    // Build invitee name for personalized email
    const inviteeName = first_name ? `${first_name}${last_name ? ' ' + last_name : ''}` : undefined;

    c.executionCtx.waitUntil(
      emailService.sendInvitationEmail(
        email,
        user.name,
        org?.name || 'Organisatie',
        inviteUrl,
        role,
        inviteeName
      ).then(result => {
        console.log('Email send result:', result);
      }).catch(err => {
        console.error('Email send error:', err);
      })
    );

    return c.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        salutation: invitation.salutation,
        first_name: invitation.first_name,
        last_name: invitation.last_name,
        expires_at: invitation.expires_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Uitnodiging verzenden mislukt';
    return c.json({ error: message }, 400);
  }
});

// Get invitation details by token (public - for invite page)
app.get('/invitations/:token', async (c) => {
  const token = c.req.param('token');

  const invitationService = new InvitationService(c.env.DB);
  const invitation = await invitationService.validateInvitation(token);

  if (!invitation) {
    return c.json({ error: 'Ongeldige of verlopen uitnodiging' }, 404);
  }

  return c.json({
    email: invitation.email,
    organization_name: invitation.organization_name,
    invited_by_name: invitation.invited_by_name,
    role: invitation.role,
    salutation: invitation.salutation,
    first_name: invitation.first_name,
    last_name: invitation.last_name,
    expires_at: invitation.expires_at,
  });
});

// Cancel invitation
app.delete('/invitations/:id', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const invitationId = parseInt(c.req.param('id'));

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  const authService = new AuthService(c.env.DB);
  const canManage = await authService.canUserInvite(user.id, user.organization_id);
  if (!canManage) {
    return c.json({ error: 'Je hebt geen rechten om uitnodigingen te annuleren' }, 403);
  }

  const invitationService = new InvitationService(c.env.DB);
  const success = await invitationService.cancelInvitation(invitationId, user.organization_id);

  if (!success) {
    return c.json({ error: 'Uitnodiging niet gevonden' }, 404);
  }

  return c.json({ success: true });
});

// Resend invitation
app.post('/invitations/:id/resend', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const invitationId = parseInt(c.req.param('id'));

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  const authService = new AuthService(c.env.DB);
  const canManage = await authService.canUserInvite(user.id, user.organization_id);
  if (!canManage) {
    return c.json({ error: 'Je hebt geen rechten om uitnodigingen te versturen' }, 403);
  }

  const invitationService = new InvitationService(c.env.DB);
  const invitation = await invitationService.resendInvitation(invitationId, user.organization_id);

  if (!invitation) {
    return c.json({ error: 'Uitnodiging niet gevonden' }, 404);
  }

  // Get organization name for email
  const org = await c.env.DB
    .prepare('SELECT name FROM organizations WHERE id = ?')
    .bind(user.organization_id)
    .first<{ name: string }>();

  // Send invitation email again
  const emailService = new EmailService(c.env);
  const origin = c.req.header('origin') || c.env.APP_URL || 'http://localhost:5173';
  const inviteUrl = `${origin}/invite?token=${invitation.token}`;

  // Build invitee name for personalized email
  const inviteeName = invitation.first_name ? `${invitation.first_name}${invitation.last_name ? ' ' + invitation.last_name : ''}` : undefined;

  c.executionCtx.waitUntil(
    emailService.sendInvitationEmail(
      invitation.email,
      user.name,
      org?.name || 'Organisatie',
      inviteUrl,
      invitation.role,
      inviteeName
    )
  );

  return c.json({ success: true });
});

// Update member role
app.put('/members/:id', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const memberId = parseInt(c.req.param('id'));

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  // Only owners can change roles
  const authService = new AuthService(c.env.DB);
  const orgData = await authService.getUserOrganization(user.id);

  if (!orgData || orgData.role !== 'owner') {
    return c.json({ error: 'Alleen de eigenaar kan rollen wijzigen' }, 403);
  }

  const { role } = await c.req.json();

  if (role !== 'admin' && role !== 'member') {
    return c.json({ error: 'Ongeldige rol' }, 400);
  }

  // Can't change own role
  if (memberId === user.id) {
    return c.json({ error: 'Je kunt je eigen rol niet wijzigen' }, 400);
  }

  // Check if target is a member of the organization
  const targetMember = await c.env.DB
    .prepare('SELECT id FROM organization_members WHERE user_id = ? AND organization_id = ?')
    .bind(memberId, user.organization_id)
    .first();

  if (!targetMember) {
    return c.json({ error: 'Gebruiker niet gevonden in je organisatie' }, 404);
  }

  await c.env.DB
    .prepare('UPDATE organization_members SET role = ? WHERE user_id = ? AND organization_id = ?')
    .bind(role, memberId, user.organization_id)
    .run();

  return c.json({ success: true });
});

// Remove member from organization
app.delete('/members/:id', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const memberId = parseInt(c.req.param('id'));

  if (!user.organization_id) {
    return c.json({ error: 'Geen organisatie gevonden' }, 404);
  }

  // Only owners can remove members
  const authService = new AuthService(c.env.DB);
  const orgData = await authService.getUserOrganization(user.id);

  if (!orgData || orgData.role !== 'owner') {
    return c.json({ error: 'Alleen de eigenaar kan teamleden verwijderen' }, 403);
  }

  // Can't remove yourself
  if (memberId === user.id) {
    return c.json({ error: 'Je kunt jezelf niet verwijderen' }, 400);
  }

  // Check if target is a member
  const targetMember = await c.env.DB
    .prepare('SELECT role FROM organization_members WHERE user_id = ? AND organization_id = ?')
    .bind(memberId, user.organization_id)
    .first<{ role: string }>();

  if (!targetMember) {
    return c.json({ error: 'Gebruiker niet gevonden in je organisatie' }, 404);
  }

  // Can't remove another owner
  if (targetMember.role === 'owner') {
    return c.json({ error: 'Je kunt geen andere eigenaar verwijderen' }, 400);
  }

  // Remove from organization
  await c.env.DB
    .prepare('DELETE FROM organization_members WHERE user_id = ? AND organization_id = ?')
    .bind(memberId, user.organization_id)
    .run();

  // Update user's organization_id to null
  await c.env.DB
    .prepare('UPDATE users SET organization_id = NULL WHERE id = ?')
    .bind(memberId)
    .run();

  return c.json({ success: true });
});

export default app;
