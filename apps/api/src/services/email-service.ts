import type { Env } from '../types';

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

interface MailgunResponse {
  id?: string;
  message?: string;
}

export class EmailService {
  constructor(private env: Env) {}

  private async send(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!this.env.MAILGUN_API_KEY || !this.env.MAILGUN_DOMAIN) {
      console.warn('Mailgun not configured, skipping email');
      return { success: false, error: 'Email not configured' };
    }

    try {
      const formData = new FormData();
      formData.append('from', this.env.EMAIL_FROM || 'Tesoro <noreply@tesorohq.io>');
      
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      recipients.forEach(recipient => formData.append('to', recipient));
      
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) {
        formData.append('text', options.text);
      }

      const response = await fetch(
        `https://api.eu.mailgun.net/v3/${this.env.MAILGUN_DOMAIN}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`api:${this.env.MAILGUN_API_KEY}`)}`,
          },
          body: formData,
        }
      );

      const data = await response.json() as MailgunResponse;

      if (!response.ok) {
        console.error('Email send failed:', data);
        return { success: false, error: data.message || 'Failed to send email' };
      }

      console.log('Email sent successfully:', data.id);
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
          .logo { height: 50px; width: auto; }
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
            <img src="${this.env.APP_URL || ''}/logo.png" alt="Tesoro" class="logo" />
          </div>
          <div class="content">
            <h1>Welkom, ${name}!</h1>
            <p>Bedankt voor je registratie bij Tesoro. Je account is nu actief en je kunt direct aan de slag.</p>
            <p>Met Tesoro kun je:</p>
            <ul>
              <li>XML feeds importeren en beheren</li>
              <li>Per relatie aangepaste property selecties maken</li>
              <li>Unieke feed URLs genereren voor je relaties</li>
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
Welkom bij Tesoro, ${name}!

Bedankt voor je registratie. Je account is nu actief.

Met Tesoro kun je:
- XML feeds importeren en beheren
- Per relatie aangepaste property selecties maken
- Unieke feed URLs genereren voor je relaties

Heb je vragen? Neem gerust contact met ons op.
    `.trim();

    return this.send({ to, subject: `Welkom bij Tesoro, ${name}!`, html, text });
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
          .logo { height: 50px; width: auto; }
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
            <img src="${this.env.APP_URL || ''}/logo.png" alt="Tesoro" class="logo" />
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

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string
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
          .logo { height: 50px; width: auto; }
          .content { background: #f8fafc; border-radius: 8px; padding: 30px; }
          h1 { font-size: 20px; margin: 0 0 20px 0; }
          p { margin: 0 0 15px 0; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${this.env.APP_URL || ''}/logo.png" alt="Tesoro" class="logo" />
          </div>
          <div class="content">
            <h1>Wachtwoord resetten</h1>
            <p>Hallo ${name},</p>
            <p>We hebben een verzoek ontvangen om je wachtwoord te resetten. Klik op de onderstaande knop om een nieuw wachtwoord in te stellen.</p>
            <p style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" class="button">Wachtwoord resetten</a>
            </p>
            <div class="warning">
              <strong>Let op:</strong> Deze link is 1 uur geldig. Als je geen wachtwoord reset hebt aangevraagd, kun je deze email negeren.
            </div>
            <p style="font-size: 14px; color: #64748b;">Als de knop niet werkt, kopieer dan deze link naar je browser:</p>
            <p style="font-size: 12px; word-break: break-all; color: #64748b;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>Dit is een automatisch gegenereerde email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Wachtwoord resetten

Hallo ${name},

We hebben een verzoek ontvangen om je wachtwoord te resetten.

Klik op deze link om een nieuw wachtwoord in te stellen:
${resetUrl}

Let op: Deze link is 1 uur geldig.

Als je geen wachtwoord reset hebt aangevraagd, kun je deze email negeren.
    `.trim();

    return this.send({
      to,
      subject: 'Wachtwoord resetten - Tesoro',
      html,
      text,
    });
  }

  async sendInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    inviteUrl: string,
    role: string
  ): Promise<{ success: boolean }> {
    const roleText = role === 'admin' ? 'beheerder' : 'teamlid';

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
          .org-box { background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin: 20px 0; text-align: center; }
          .org-name { font-size: 18px; font-weight: 600; color: #1e293b; }
          .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; margin-top: 8px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; font-size: 14px; }
          .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">XML Customizer</div>
          </div>
          <div class="content">
            <h1>Je bent uitgenodigd!</h1>
            <p>${inviterName} heeft je uitgenodigd om deel te nemen aan hun team op XML Customizer.</p>
            <div class="org-box">
              <div class="org-name">${organizationName}</div>
              <div class="role-badge">Rol: ${roleText}</div>
            </div>
            <p>Als ${roleText} kun je feeds beheren en klanten toevoegen. ${role === 'admin' ? 'Je kunt ook andere teamleden uitnodigen.' : ''}</p>
            <p style="text-align: center; margin: 25px 0;">
              <a href="${inviteUrl}" class="button">Uitnodiging accepteren</a>
            </p>
            <div class="warning">
              <strong>Let op:</strong> Deze uitnodiging is 7 dagen geldig. Als je geen account hebt, wordt er automatisch een voor je aangemaakt.
            </div>
            <p style="font-size: 14px; color: #64748b;">Als de knop niet werkt, kopieer dan deze link naar je browser:</p>
            <p style="font-size: 12px; word-break: break-all; color: #64748b;">${inviteUrl}</p>
          </div>
          <div class="footer">
            <p>Dit is een automatisch gegenereerde email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Je bent uitgenodigd!

${inviterName} heeft je uitgenodigd om deel te nemen aan hun team op XML Customizer.

Organisatie: ${organizationName}
Rol: ${roleText}

Klik op deze link om de uitnodiging te accepteren:
${inviteUrl}

Let op: Deze uitnodiging is 7 dagen geldig.
    `.trim();

    return this.send({
      to,
      subject: `${inviterName} nodigt je uit voor ${organizationName} - XML Customizer`,
      html,
      text,
    });
  }
}
