import { z } from 'zod';

import type { ListarServicesUseCase } from '../../../application/use-cases/services/listar-services';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import { getUserIdentity } from '../../guards/user-identity';

const querySchema = z
  .object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    includeHidden: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();

/**
 * GET /api/v1/services — Listado público paginado de servicios.
 * Solo devuelve servicios `ACTIVE`, ordenados por `orden`. No requiere sesión.
 * Cursor opaco `{ orden, id }`; límite por defecto 12, máximo 50.
 * `includeHidden=true` requiere una sesión de administrador válida.
 */
export const makeListServicesHandler =
  (listarServicesUseCase: ListarServicesUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cursor, limit, includeHidden } = querySchema.parse(req.query);

      if (includeHidden === true && !getUserIdentity(res)) {
        throw new ApiError(
          errorCode.unauthorized,
          'Se requiere sesión de administrador para ver servicios ocultos',
        );
      }

      const resultado = await listarServicesUseCase.execute({
        cursor,
        limit,
        includeHidden: includeHidden === true,
      });
      writeSuccess(res, resultado, 'Listado de servicios');
    } catch (error) {
      next(error);
    }
  };
