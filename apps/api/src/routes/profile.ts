import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ProfileService } from '../services/profile-service';
import { EmailService } from '../services/email-service';
import { AuthService } from '../services/auth-service';
import { sessionAuth } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get current user profile
app.get('/', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const profileService = new ProfileService(c.env.DB);
  const pendingEmailChange = await profileService.getPendingEmailChange(user.id);

  return c.json({
    profile: {
      id: user.id,
      email: user.email,
      name: user.name,
      salutation: user.salutation,
      first_name: user.first_name,
      last_name: user.last_name,
      preferred_language: user.preferred_language,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
    pendingEmailChange,
  });
});

// Update profile
app.put('/', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { salutation, first_name, last_name, name, preferred_language } = await c.req.json();

  // Validate salutation if provided
  const validSalutations = ['mr', 'ms', 'mrs', 'mx', 'dr', 'prof', 'other', null];
  if (salutation !== undefined && !validSalutations.includes(salutation)) {
    return c.json({ error: 'Ongeldige aanhef' }, 400);
  }

  // Validate preferred_language if provided
  const validLanguages = ['es', 'ca', 'eu', 'gl', 'en', 'de', 'fr', 'nl', 'pt', 'pl', 'ru', 'sv'];
  if (preferred_language !== undefined && !validLanguages.includes(preferred_language)) {
    return c.json({ error: 'Ongeldige taal' }, 400);
  }

  // Validate name if provided (required field)
  if (name !== undefined && (!name || name.trim().length === 0)) {
    return c.json({ error: 'Naam is verplicht' }, 400);
  }

  const profileService = new ProfileService(c.env.DB);

  await profileService.updateProfile(user.id, {
    salutation,
    first_name: first_name?.trim() || null,
    last_name: last_name?.trim() || null,
    name: name?.trim(),
    preferred_language,
  });

  // Fetch updated user data
  const authService = new AuthService(c.env.DB);
  const updatedUser = await authService.getUserByEmail(user.email);

  return c.json({
    success: true,
    profile: updatedUser,
  });
});

// Request email change
app.post('/change-email', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { new_email } = await c.req.json();

  if (!new_email) {
    return c.json({ error: 'Nieuw emailadres is verplicht' }, 400);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(new_email)) {
    return c.json({ error: 'Ongeldig email adres' }, 400);
  }

  // Check if email is the same as current
  if (new_email.toLowerCase() === user.email.toLowerCase()) {
    return c.json({ error: 'Dit is je huidige emailadres' }, 400);
  }

  try {
    const profileService = new ProfileService(c.env.DB);
    const result = await profileService.requestEmailChange(user.id, new_email);

    if (!result) {
      return c.json({ error: 'Emailwijziging aanvragen mislukt' }, 500);
    }

    // Send verification email to new address
    const emailService = new EmailService(c.env);
    const origin = c.req.header('origin') || c.env.APP_URL || 'http://localhost:5173';
    const verifyUrl = `${origin}/verify-email?token=${result.token}`;

    c.executionCtx.waitUntil(
      emailService.sendEmailChangeVerification(new_email, user.name, verifyUrl)
    );

    return c.json({
      success: true,
      message: 'Verificatie email verzonden naar je nieuwe adres',
      pendingEmailChange: {
        newEmail: new_email,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Emailwijziging aanvragen mislukt';
    return c.json({ error: message }, 400);
  }
});

// Cancel pending email change
app.delete('/change-email', sessionAuth, async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const profileService = new ProfileService(c.env.DB);
  await profileService.cancelEmailChange(user.id);

  return c.json({ success: true });
});

// Verify email change (public endpoint - accessed via email link)
app.post('/verify-email', async (c) => {
  const { token } = await c.req.json();

  if (!token) {
    return c.json({ error: 'Token is verplicht' }, 400);
  }

  try {
    const profileService = new ProfileService(c.env.DB);
    const result = await profileService.verifyEmailChange(token);

    if (!result) {
      return c.json({ error: 'Ongeldige of verlopen verificatie link' }, 400);
    }

    return c.json({
      success: true,
      message: 'Je emailadres is succesvol gewijzigd',
      newEmail: result.newEmail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email verificatie mislukt';
    return c.json({ error: message }, 400);
  }
});

export default app;
