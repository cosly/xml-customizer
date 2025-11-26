import type { Env } from '../types';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface ResendResponse {
  id?: string;
  error?: string;
}

export class EmailService {
  constructor(private env: Env) {}

  private async send(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.env.EMAIL_FROM || 'XML Customizer <noreply@example.com>',
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      const data = await response.json() as ResendResponse;

      if (!response.ok) {
        console.error('Email send failed:', data);
        return { success: false, error: data.error || 'Failed to send email' };
      }

      return { success: true, id: data.id };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
          .content { background: #f8fafc; border-radius: 8px; padding: 30px; }
          h1 { font-size: 20px; margin: 0 0 20px 0; }
          p { margin: 0 0 15px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">XML Customizer</div>
          </div>
          <div class="content">
            <h1>Welkom, ${name}!</h1>
            <p>Bedankt voor je registratie bij XML Customizer. Je account is nu actief en je kunt direct aan de slag.</p>
            <p>Met XML Customizer kun je:</p>
            <ul>
              <li>XML feeds importeren en beheren</li>
              <li>Per klant aangepaste property selecties maken</li>
              <li>Unieke feed URLs genereren voor je klanten</li>
            </ul>
            <p>Heb je vragen? Neem gerust contact met ons op.</p>
          </div>
          <div class="footer">
            <p>Dit is een automatisch gegenereerde email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welkom bij XML Customizer, ${name}!

Bedankt voor je registratie. Je account is nu actief.

Met XML Customizer kun je:
- XML feeds importeren en beheren
- Per klant aangepaste property selecties maken
- Unieke feed URLs genereren voor je klanten

Heb je vragen? Neem gerust contact met ons op.
    `.trim();

    return this.send({ to, subject: `Welkom bij XML Customizer, ${name}!`, html, text });
  }

  async sendFeedShareEmail(
    to: string,
    senderName: string,
    customerName: string,
    feedUrl: string,
    message?: string
  ): Promise<{ success: boolean }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
          .content { background: #f8fafc; border-radius: 8px; padding: 30px; }
          h1 { font-size: 20px; margin: 0 0 20px 0; }
          p { margin: 0 0 15px 0; }
          .url-box { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; word-break: break-all; font-family: monospace; font-size: 14px; margin: 20px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .message { background: white; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; font-style: italic; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">XML Customizer</div>
          </div>
          <div class="content">
            <h1>Je XML Feed is klaar!</h1>
            <p>${senderName} heeft een gepersonaliseerde XML feed voor je klaargezet.</p>
            ${message ? `<div class="message">${message}</div>` : ''}
            <p><strong>Je feed URL:</strong></p>
            <div class="url-box">${feedUrl}</div>
            <p>Gebruik deze URL in je systeem om je property gegevens op te halen. De feed wordt automatisch bijgewerkt wanneer er wijzigingen zijn.</p>
            <p style="text-align: center; margin-top: 25px;">
              <a href="${feedUrl}" class="button">Bekijk Feed</a>
            </p>
          </div>
          <div class="footer">
            <p>Feed voor: ${customerName}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Je XML Feed is klaar!

${senderName} heeft een gepersonaliseerde XML feed voor je klaargezet.
${message ? `\nBericht: ${message}\n` : ''}
Je feed URL:
${feedUrl}

Gebruik deze URL in je systeem om je property gegevens op te halen.

---
Feed voor: ${customerName}
    `.trim();

    return this.send({
      to,
      subject: `Je XML Feed van ${senderName}`,
      html,
      text,
    });
  }
}
