/**
 * Puerto de envío de correos (US3.2).
 *
 * La infraestructura (Resend) implementa este puerto. La capa de aplicación
 * no conoce detalles de proveedores ni de transporte.
 */

export interface EmailSender {
  /**
   * Envía un correo electrónico.
   *
   * @param to - Correo del destinatario.
   * @param subject - Asunto del correo.
   * @param html - Cuerpo HTML del correo.
   * @param replyTo - Correo al que se debe responder (opcional). Cuando se omite, se usa el remitente por defecto.
   * @throws Cuando el proveedor de correo falla. El llamante decide qué fallos son fatales.
   */
  send(to: string, subject: string, html: string, replyTo?: string): Promise<void>;
}
