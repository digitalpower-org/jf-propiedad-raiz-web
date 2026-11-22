import { z } from 'zod';

import type {
  ObtenerServiceUseCase,
  ObtenerServiceCommand,
} from '../../../application/use-cases/services/obtener-services';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import { MSG_SERVICE_OBTAINED } from '../../messages';
import { getUserIdentity } from '../../guards/user-identity';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

const querySchema = z
  .object({
    includeHidden: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();

/**
 * GET /api/v1/services/{idOrSlug} — Obtener un servicio público por id o slug.
 * `esPublico: true` hace que el caso de uso responda 404 `SERVICE_NOT_FOUND`
 * para servicios `HIDDEN` (salvo `includeHidden=true` con sesión admin) y `DELETED`.
 */
export const makeGetServiceHandler =
  (useCase: ObtenerServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const { includeHidden } = querySchema.parse(req.query);

      const puedeIncluirHidden = includeHidden === true && !!getUserIdentity(res);

      if (includeHidden === true && !getUserIdentity(res)) {
        throw new ApiError(
          errorCode.unauthorized,
          'Se requiere sesión de administrador para ver servicios ocultos',
        );
      }

      const command: ObtenerServiceCommand = {
        idOrSlug: params.idOrSlug,
        esPublico: true,
        includeHidden: puedeIncluirHidden,
      };

      const resultado = await useCase.execute(command);

      // Defensa en profundidad: HIDDEN sin permiso o DELETED siempre 404
      if (resultado.service.status === 'HIDDEN' && !puedeIncluirHidden) {
        throw new ApiError(errorCode.serviceNotFound, `Servicio no encontrado: ${params.idOrSlug}`);
      }
      if (resultado.service.status === 'DELETED') {
        throw new ApiError(errorCode.serviceNotFound, `Servicio no encontrado: ${params.idOrSlug}`);
      }

      writeSuccess(res, resultado.service, MSG_SERVICE_OBTAINED);
    } catch (error) {
      next(error);
    }
  };
