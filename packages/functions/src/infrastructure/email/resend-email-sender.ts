import { Resend, type Tag } from 'resend';

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

  async send(
    to: string,
    subject: string,
    html: string,
    replyTo?: string,
    tags?: Readonly<Record<string, string>>,
  ): Promise<void> {
    const result = await this.resend.emails.send({
      from: `Consignaciones <${this.fromEmail}>`,
      to,
      subject,
      html,
      // exactOptionalPropertyTypes: no enviar `replyTo: undefined` ni `tags: undefined`.
      ...(replyTo !== undefined ? { replyTo } : {}),
      ...(tags !== undefined
        ? { tags: Object.entries(tags).map(([name, value]) => ({ name, value }) as Tag) }
        : {}),
    });

    if (result.error) {
      throw new Error('Resend error: ' + result.error.message);
    }

    return undefined;
  }
}
