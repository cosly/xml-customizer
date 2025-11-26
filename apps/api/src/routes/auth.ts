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
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, wachtwoord en naam zijn verplicht' }, 400);
    }

    const authService = new AuthService(c.env.DB);
    const user = await authService.register(email, password, name);

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

export default app;
