import { Resend } from 'resend';
import { z } from 'zod';

import type { DeliveryWebhookVerifier } from '../../application/ports/delivery-webhook-verifier';

/**
 * Esquema de validación del evento devuelto por `resend.webhooks.verify`.
 *
 * El SDK devuelve `unknown` en tiempo de ejecución; validamos la forma mínima
 * que necesitamos (`type`, `created_at`, `data.tags`) antes de mapearla al
 * contrato del puerto. No se expone el SDK ni el payload crudo.
 */
const WebhookEventSchema = z.object({
  type: z.string(),
  created_at: z.string().datetime(),
  data: z.object({
    tags: z.record(z.string(), z.string()).optional().default({}),
  }),
});

/**
 * Adaptador de verificación de firma del webhook de delivery de Resend (T5).
 *
 * Usa `new Resend(apiKey).webhooks.verify(...)` con las cabeceras Svix
 * (`svix-id`, `svix-timestamp`, `svix-signature`). Devuelve solo los campos
 * mínimos del evento: `eventId`, `eventType`, `createdAt`, `tags`.
 */
export class ResendWebhookVerifier implements DeliveryWebhookVerifier {
  private readonly resend: Resend;
  private readonly webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.resend = new Resend(apiKey);
    this.webhookSecret = webhookSecret;
  }

  async verify(input: {
    readonly rawBody: string | Buffer;
    readonly headers: Record<string, string | string[] | undefined>;
  }): Promise<{
    readonly eventId: string;
    readonly eventType: string;
    readonly createdAt: string;
    readonly tags: Readonly<Record<string, string>>;
  }> {
    const { rawBody, headers } = input;

    const payload = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    const obtenerCabecera = (nombre: string): string | undefined => {
      const valor = headers[nombre];
      return typeof valor === 'string' ? valor : Array.isArray(valor) ? valor[0] : undefined;
    };

    const svixId = obtenerCabecera('svix-id');
    const svixTimestamp = obtenerCabecera('svix-timestamp');
    const svixSignature = obtenerCabecera('svix-signature');
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new Error('Cabeceras Svix incompletas');
    }

    const event = this.resend.webhooks.verify({
      payload,
      headers: {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      },
      webhookSecret: this.webhookSecret,
    });

    const parsed = WebhookEventSchema.parse(event);

    return {
      eventId: svixId,
      eventType: parsed.type,
      createdAt: parsed.created_at,
      tags: parsed.data.tags,
    };
  }
}
