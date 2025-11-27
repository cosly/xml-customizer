import { Hono } from 'hono';
import { setCookie, deleteCookie } from 'hono/cookie';
import type { Env, Variables } from '../types';
import { AuthService } from '../services/auth-service';
import { EmailService } from '../services/email-service';
import { sessionAuth } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// Register new user
app.post('/register', async (c) => {
  try {
    const { email, password, name, invitationToken } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, wachtwoord en naam zijn verplicht' }, 400);
    }

    const authService = new AuthService(c.env.DB);
    const user = await authService.register(email, password, name, invitationToken);

    // Auto-login after registration
    const { session } = await authService.login(email, password);

    // Send welcome email (non-blocking)
    const emailService = new EmailService(c.env);
    c.executionCtx.waitUntil(emailService.sendWelcomeEmail(email, name));

    // Set session cookie
    setCookie(c, 'session', session.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return c.json({
      user,
      session: { id: session.id, expires_at: session.expires_at },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registratie mislukt';
    return c.json({ error: message }, 400);
  }
});

// Login
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email en wachtwoord zijn verplicht' }, 400);
    }

    const authService = new AuthService(c.env.DB);
    const { user, session } = await authService.login(email, password);

    // Set session cookie
    setCookie(c, 'session', session.id, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return c.json({
      user,
      session: { id: session.id, expires_at: session.expires_at },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Inloggen mislukt';
    return c.json({ error: message }, 401);
  }
});

// Logout
app.post('/logout', sessionAuth, async (c) => {
  const sessionId = c.get('sessionId');

  if (sessionId) {
    const authService = new AuthService(c.env.DB);
    await authService.logout(sessionId);
  }

  deleteCookie(c, 'session', { path: '/' });

  return c.json({ success: true });
});

// Get current user
app.get('/me', sessionAuth, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Request password reset
app.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is verplicht' }, 400);
    }

    const authService = new AuthService(c.env.DB);
    const result = await authService.createPasswordResetToken(email);

    // Always return success to prevent email enumeration
    if (result) {
      console.log('=== FORGOT PASSWORD: Sending email ===');
      console.log('User email:', result.user.email);
      console.log('MAILGUN_API_KEY exists:', !!c.env.MAILGUN_API_KEY);
      console.log('MAILGUN_DOMAIN exists:', !!c.env.MAILGUN_DOMAIN);
      
      const emailService = new EmailService(c.env);

      // Build reset URL - use the request origin or fall back to config
      const origin = c.req.header('origin') || c.env.APP_URL || 'http://localhost:5173';
      const resetUrl = `${origin}/reset-password?token=${result.token}`;
      console.log('Reset URL:', resetUrl);

      // Send email (non-blocking)
      c.executionCtx.waitUntil(
        emailService.sendPasswordResetEmail(result.user.email, result.user.name, resetUrl)
          .then(res => console.log('Password reset email result:', res))
          .catch(err => console.error('Password reset email error:', err))
      );
    } else {
      console.log('=== FORGOT PASSWORD: No user found for email ===');
    }

    return c.json({
      success: true,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ error: 'server_error' }, 500);
  }
});

// Reset password with token
app.post('/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json();

    if (!token || !password) {
      return c.json({ error: 'Token en wachtwoord zijn verplicht' }, 400);
    }

    const authService = new AuthService(c.env.DB);
    const user = await authService.resetPassword(token, password);

    if (!user) {
      return c.json({ error: 'Ongeldige of verlopen reset link' }, 400);
    }

    return c.json({
      success: true,
      message: 'Je wachtwoord is succesvol gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Wachtwoord reset mislukt';
    return c.json({ error: message }, 400);
  }
});

export default app;
