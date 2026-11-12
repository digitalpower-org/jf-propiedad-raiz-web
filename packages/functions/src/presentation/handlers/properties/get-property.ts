import { z } from 'zod';

import type {
  ObtenerPropertyUseCase,
  ObtenerPropertyCommand,
} from '../../../application/use-cases/properties/obtener-property';
import { writeSuccess } from '../../protocol';
import { MSG_PROPERTY_OBTAINED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * GET /api/v1/properties/{idOrSlug} — Obtener un inmueble por id o slug.
 * Desde la web pública, una ficha `HIDDEN` o `DELETED` responde 404 `PROPERTY_NOT_FOUND` (AC1.7.7).
 * No requiere sesión.
 */
export const makeObtenerPropertyHandler =
  (useCase: ObtenerPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: ObtenerPropertyCommand = {
        idOrSlug: params.idOrSlug,
        esPublico: true,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_OBTAINED);
    } catch (error) {
      next(error);
    }
  };
