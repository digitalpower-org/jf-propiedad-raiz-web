/**
 * Puerto de verificación de firma del webhook de delivery de Resend (T5).
 *
 * Recibe el body crudo y las cabeceras de la petición HTTP, verifica la
 * firma Svix y devuelve el evento validado sin exponer el SDK de Resend.
 *
 * La capa de aplicación no conoce detalles del proveedor de webhooks.
 */

export interface DeliveryWebhookVerifier {
  /**
   * Verifica la firma de un webhook de delivery de Resend y devuelve el
   * evento validado con los campos mínimos necesarios.
   *
   * @param rawBody - Body crudo de la petición (bytes originales, sin parsear).
   * @param headers - Cabeceras HTTP de la petición (`svix-id`, `svix-timestamp`, `svix-signature`).
   * @returns Evento validado: `eventId`, `eventType`, `createdAt`, `tags`.
   * @throws Cuando la firma es inválida o el payload no tiene la forma esperada.
   */
  verify(input: {
    readonly rawBody: string | Buffer;
    readonly headers: Record<string, string>;
  }): Promise<{
    readonly eventId: string;
    readonly eventType: string;
    readonly createdAt: string;
    readonly tags: Readonly<Record<string, string>>;
  }>;
}

export type VerifiedResendEvent = {
  readonly eventId: string;
  readonly eventType: string;
  readonly createdAt: string;
  readonly tags: Readonly<Record<string, string>>;
};
