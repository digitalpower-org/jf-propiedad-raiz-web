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
   * @throws Cuando el proveedor de correo falla (se traduce a `EMAIL_DELIVERY_FAILED`).
   */
  send(to: string, subject: string, html: string): Promise<void>;
}
