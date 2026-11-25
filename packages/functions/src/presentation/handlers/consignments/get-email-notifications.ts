import { z } from 'zod';

import type { ObtenerNotificacionesResendUseCase } from '../../../application/use-cases/consignments/obtener-notificaciones-resend';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';

const querySchema = z.object({
  requestId: z.string().min(1, 'El identificador de solicitud es obligatorio'),
});

/**
 * GET /api/v1/consignments/email-notifications?requestId=... (T6/T7).
 *
 * Ruta interna protegida por `guardInternal` (`X-Internal-Key`) y límite de
 * velocidad. Devuelve las notificaciones crudas de Resend para la solicitud,
 * sin interpretar si implican éxito, espera o fallo. Responde `200` con
 * `notifications: []` cuando no hay notificaciones vigentes.
 */
export const makeGetEmailNotificationsHandler =
  (obtenerNotificaciones: ObtenerNotificacionesResendUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { requestId } = querySchema.parse(req.query);
      const resultado = await obtenerNotificaciones.execute({ requestId });
      writeSuccess(
        res,
        { requestId: resultado.requestId, notifications: resultado.notifications },
        '',
      );
    } catch (error) {
      next(error);
    }
  };
