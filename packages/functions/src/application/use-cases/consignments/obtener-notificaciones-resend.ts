/**
 * Caso de uso: consultar notificaciones de delivery de Resend (T6).
 *
 * Devuelve las notificaciones crudas vigentes para un `requestId`. El
 * repositorio ya excluye las expiradas (`expiresAt <= now`) y ordena por
 * `receivedAt` en memoria. El backend no interpreta el evento: entrega datos
 * crudos para que el BFF aplique su propia regla de éxito/espera/fallo.
 *
 * No registra PII en logs (solo `requestId` y conteo, que no son datos
 * personales).
 */

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ConsignmentEmailNotificationRepository } from '../../ports/consignment-email-notification-repository';
import type { ResendNotification } from '../../consignments/resend-notification';

export interface ObtenerNotificacionesResendCommand {
  readonly requestId: string;
}

export interface ObtenerNotificacionesResendResult {
  readonly requestId: string;
  readonly notifications: readonly ResendNotification[];
}

export class ObtenerNotificacionesResendUseCase implements UseCase<
  ObtenerNotificacionesResendCommand,
  ObtenerNotificacionesResendResult
> {
  constructor(
    private readonly repository: ConsignmentEmailNotificationRepository,
    private readonly logger: Logger,
  ) {}

  async execute(
    command: ObtenerNotificacionesResendCommand,
  ): Promise<ObtenerNotificacionesResendResult> {
    const notifications = await this.repository.listByRequestId(command.requestId);

    this.logger.debug('consulta_notificaciones_resend', {
      requestId: command.requestId,
      total: notifications.length,
    });

    return {
      requestId: command.requestId,
      notifications,
    };
  }
}
