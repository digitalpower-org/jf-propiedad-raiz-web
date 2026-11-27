/**
 * Caso de uso: registrar una notificación de delivery de Resend (T5).
 *
 * Solo persiste notificaciones con tag de admin y `consignmentRequestId`
 * válido. Los eventos `client`, sin tag o desconocidos se ignoran con `200`
 * sin escritura. No deriva estado, severidad ni conclusión.
 */

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { ConsignmentEmailNotificationRepository } from '../../ports/consignment-email-notification-repository';
import {
  CONSIGNMENT_REQUEST_ID_TAG,
  esNotificacionAdmin,
} from '../../consignments/resend-notification';

export interface RegistrarNotificacionResendCommand {
  readonly eventId: string;
  readonly eventType: string;
  readonly createdAt: string;
  readonly tags: Readonly<Record<string, string>>;
}

export interface RegistrarNotificacionResendResult {
  readonly persistida: boolean;
}

export class RegistrarNotificacionResendUseCase implements UseCase<
  RegistrarNotificacionResendCommand,
  RegistrarNotificacionResendResult
> {
  constructor(
    private readonly repository: ConsignmentEmailNotificationRepository,
    private readonly logger: Logger,
    private readonly ttlSeconds: number,
  ) {}

  async execute(
    command: RegistrarNotificacionResendCommand,
  ): Promise<RegistrarNotificacionResendResult> {
    const { tags } = command;

    // Solo las notificaciones con tag de admin se persisten.
    if (!esNotificacionAdmin(tags)) {
      this.logger.debug('webhook_notificacion_no_admin_ignorada');
      return { persistida: false };
    }

    // El `consignmentRequestId` es obligatorio para correlacionar con la solicitud.
    const requestId = tags[CONSIGNMENT_REQUEST_ID_TAG];
    if (!requestId || requestId.trim().length === 0) {
      this.logger.debug('webhook_notificacion_sin_request_id_ignorada');
      return { persistida: false };
    }

    await this.repository.appendIfAbsent({
      svixId: command.eventId,
      requestId,
      notification: {
        eventId: command.eventId,
        eventType: command.eventType,
        createdAt: command.createdAt,
        receivedAt: new Date().toISOString(),
      },
      expiresAt: calcularExpiracion(command.createdAt, this.ttlSeconds),
    });

    return { persistida: true };
  }
}

function calcularExpiracion(createdAt: string, ttlSeconds: number): string {
  return new Date(new Date(createdAt).getTime() + ttlSeconds * 1000).toISOString();
}
