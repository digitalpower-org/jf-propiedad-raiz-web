import { z } from 'zod';

import type {
  OcultarServiceUseCase,
  OcultarServiceCommand,
} from '../../../application/use-cases/services/ocultar-services';
import { writeSuccess } from '../../protocol';
import { MSG_SERVICE_HIDDEN } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * POST /api/v1/services/{idOrSlug}/hide — Ocultar un servicio (ACTIVE → HIDDEN).
 * Requiere sesión de admin. No cambia `fechaPublicacion`. Tras la escritura se revalida (US0.3).
 */
export const makeHideServiceHandler =
  (useCase: OcultarServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: OcultarServiceCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.service, MSG_SERVICE_HIDDEN);
    } catch (error) {
      next(error);
    }
  };
