import { z } from 'zod';

import type {
  EliminarServiceUseCase,
  EliminarServiceCommand,
} from '../../../application/use-cases/services/eliminar-services';
import { writeSuccess } from '../../protocol';
import { MSG_SERVICE_DELETED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * DELETE /api/v1/services/{idOrSlug} — Soft delete de un servicio (status = DELETED).
 * Requiere sesión de admin. Nunca borrado físico. Tras la escritura se revalida (US0.3).
 */
export const makeDeleteServiceHandler =
  (useCase: EliminarServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: EliminarServiceCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.service, MSG_SERVICE_DELETED);
    } catch (error) {
      next(error);
    }
  };
