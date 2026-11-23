import { z } from 'zod';

import type {
  ActivarServiceUseCase,
  ActivarServiceCommand,
} from '../../../application/use-cases/services/activar-services';
import { writeSuccess } from '../../protocol';
import { MSG_SERVICE_ACTIVATED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * POST /api/v1/services/{idOrSlug}/activate — Activar un servicio (HIDDEN → ACTIVE).
 * Requiere sesión de admin. Tras la escritura se revalida (US0.3).
 */
export const makeActivateServiceHandler =
  (useCase: ActivarServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: ActivarServiceCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.service, MSG_SERVICE_ACTIVATED);
    } catch (error) {
      next(error);
    }
  };
