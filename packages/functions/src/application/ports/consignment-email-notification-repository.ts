/**
 * Puerto de repositorio de notificaciones de correo de consignación (T3.2).
 *
 * La infraestructura (Firestore) implementa este puerto. La capa de aplicación
 * no conoce detalles de persistencia.
 */

import type { ResendNotification } from '../consignments/resend-notification';

export interface ConsignmentEmailNotificationRepository {
  /**
   * Inserta la notificación si no existe ya un documento con el mismo `svixId`
   * (idempotencia ante replays del webhook). Es un no-op cuando ya existe.
   *
   * @param svixId - Identificador del evento de Resend (se usa como id de documento).
   * @param requestId - Identificador de la solicitud de consignación.
   * @param notification - Notificación cruda a persistir.
   * @param expiresAt - Momento de expiración (ISO string) para la política TTL.
   */
  appendIfAbsent(input: {
    readonly svixId: string;
    readonly requestId: string;
    readonly notification: ResendNotification;
    readonly expiresAt: string;
  }): Promise<void>;

  /**
   * Devuelve las notificaciones vigentes para un `requestId`, excluidas las
   * expiradas (`expiresAt <= now`), ordenadas por `receivedAt`.
   *
   * @param requestId - Identificador de la solicitud de consignación.
   */
  listByRequestId(requestId: string): Promise<readonly ResendNotification[]>;
}
