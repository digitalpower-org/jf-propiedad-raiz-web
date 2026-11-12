import { Resend } from 'resend';

import type { EmailSender } from '../../application/ports/email-sender';

/**
 * Adaptador de envío de correos vía Resend (US3.2).
 *
 * Requiere la variable de entorno `RESEND_API_KEY`.
 */
export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend;
  private readonly fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    await this.resend.emails.send({
      from: `Consignaciones <${this.fromEmail}>`,
      to,
      subject,
      html,
    });
  }
}
