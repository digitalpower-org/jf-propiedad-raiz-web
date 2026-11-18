import { z } from 'zod';

import type {
  ObtenerPropertyUseCase,
  ObtenerPropertyCommand,
} from '../../../application/use-cases/properties/obtener-property';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
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
 * Si hay sesión de administrador válida, también puede devolver inmuebles `HIDDEN`.
 */
export const makeObtenerPropertyHandler =
  (useCase: ObtenerPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);

      const includeHidden = !!res.locals.userIdentity;

      const command: ObtenerPropertyCommand = {
        idOrSlug: params.idOrSlug,
        esPublico: true,
        includeHidden,
      };

      const resultado = await useCase.execute(command);

      // Defensa en profundidad: si es HIDDEN y no hay sesión admin válida, 404
      if (resultado.property.status === 'HIDDEN' && !includeHidden) {
        throw new ApiError(
          errorCode.propertyNotFound,
          `Inmueble no encontrado: ${params.idOrSlug}`,
        );
      }

      writeSuccess(res, resultado.property, MSG_PROPERTY_OBTAINED);
    } catch (error) {
      next(error);
    }
  };
