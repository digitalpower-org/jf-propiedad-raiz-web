/**
 * Tipos puros del dominio de notificaciones de email de Resend (US3.2).
 *
 * Solo representa notificaciones crudas mínimas entregadas por el webhook de
 * delivery de Resend. El backend no interpreta el evento: devuelve datos
 * crudos para que el BFF aplique su propia regla de éxito/espera/fallo.
 *
 * No importa Express, Firebase, SDKs ni capas externas.
 */

/**
 * Tipo de destinatario del correo de consignación.
 * `admin`: correo al admin de la consignación (se monitorea y persiste).
 * `client`: acuse de recibo al visitante (no se persiste).
 */
export type ResendEmailKind = 'admin' | 'client';

/**
 * Claves de tag que Resend adjunta a cada correo de consignación.
 * Permiten correlacionar el envío con la solicitud y decidir qué
 * notificaciones de webhook persisten (solo las de `admin`).
 */
export const CONSIGNMENT_KIND_TAG = 'consignmentKind';
export const CONSIGNMENT_REQUEST_ID_TAG = 'consignmentRequestId';

/**
 * Indica si una notificación de webhook debe persistirse: solo las que
 * llevan el tag de admin. Los eventos `client`, sin tag o desconocidos se
 * descartan con `200` sin escritura.
 *
 * Función pura: no tiene efectos secundarios ni depende de capas externas.
 */
export function esNotificacionAdmin(tags: Readonly<Record<string, string>>): boolean {
  return tags[CONSIGNMENT_KIND_TAG] === 'admin';
}

/**
 * Notificación cruda de Resend entregada por el webhook de delivery.
 * Solo campos mínimos, sin PII ni payload crudo del webhook.
 */
export interface ResendNotification {
  readonly eventId: string;
  readonly eventType: string;
  readonly createdAt: string;
  readonly receivedAt: string;
}
