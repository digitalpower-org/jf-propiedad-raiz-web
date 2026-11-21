import { z } from 'zod';

import type { ObtenerAboutUseCase } from '../../../application/use-cases/about/obtener-about';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';

const querySchema = z.object({});

/**
 * GET /api/v1/about — Obtener documento Nosotros.
 * No requiere sesión. Si el caso de uso devuelve null se lanza ApiError(NOT_FOUND)
 * y el middleware central lo mapea a 404; Presentation nunca escribe res.status directamente.
 */
export const makeGetAboutHandler =
  (obtenerAboutUseCase: ObtenerAboutUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      querySchema.parse(req.query);
      const resultado = await obtenerAboutUseCase.execute();
      if (!resultado) {
        throw new ApiError(errorCode.notFound, 'Documento Nosotros no encontrado');
      }
      writeSuccess(res, resultado, 'Documento Nosotros');
    } catch (error) {
      next(error);
    }
  };
