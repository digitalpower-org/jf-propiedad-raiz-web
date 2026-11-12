import { z } from 'zod';

import type {
  EliminarPropertyUseCase,
  EliminarPropertyCommand,
} from '../../../application/use-cases/properties/eliminar-property';
import { writeSuccess } from '../../protocol';
import { MSG_PROPERTY_DELETED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * DELETE /api/v1/properties/{idOrSlug} — Soft delete de un inmueble (cambia a DELETED).
 * Requiere sesión de admin. Nunca borrado físico. Tras la escritura se revalida (US0.3).
 */
export const makeDeletePropertyHandler =
  (useCase: EliminarPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: EliminarPropertyCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_DELETED);
    } catch (error) {
      next(error);
    }
  };
