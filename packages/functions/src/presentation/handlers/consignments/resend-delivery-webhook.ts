import type { NextFunction, Request, Response } from 'express';

import type { DeliveryWebhookVerifier } from '../../../application/ports/delivery-webhook-verifier';
import type { RegistrarNotificacionResendUseCase } from '../../../application/use-cases/consignments/registrar-notificacion-resend';
import type { AsyncHandler } from '../types';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

/**
 * POST /api/v1/webhooks/resend-delivery — Webhook de delivery de Resend (T5).
 *
 * Ruta pública firmada por Svix. Verifica la firma, y solo persiste las
 * notificaciones con tag de admin. Los eventos `client`, sin tag o
 * desconocidos responden `200` vacío sin escritura. Una firma inválida
 * responde `401` y nunca alcanza el caso de uso.
 */
export const makeResendDeliveryWebhookHandler =
  (
    verifier: DeliveryWebhookVerifier,
    registrarNotificacion: RegistrarNotificacionResendUseCase,
  ): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawBody = req.rawBody;
    if (rawBody === undefined) {
      next(new ApiError(errorCode.unauthorized, 'Body crudo no disponible'));
      return;
    }

    let eventType: string;
    let createdAt: string;
    let tags: Readonly<Record<string, string>>;
    let eventId: string;
    try {
      const event = await verifier.verify({
        rawBody,
        headers: req.headers as Record<string, string>,
      });
      eventId = event.eventId;
      eventType = event.eventType;
      createdAt = event.createdAt;
      tags = event.tags;
    } catch {
      next(new ApiError(errorCode.unauthorized, 'Firma de webhook inválida'));
      return;
    }

    try {
      await registrarNotificacion.execute({
        eventId,
        eventType,
        createdAt,
        tags,
      });
    } catch (error) {
      next(error);
      return;
    }

    res.status(200).end();
  };
