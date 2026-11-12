import { z } from 'zod';

import type { ObtenerAboutUseCase } from '../../../application/use-cases/about/obtener-about';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';

const querySchema = z.object({});

/**
 * GET /api/v1/about — Obtener documento Nosotros.
 * No requiere sesión.
 */
export const makeGetAboutHandler =
  (obtenerAboutUseCase: ObtenerAboutUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      querySchema.parse(req.query);
      const resultado = await obtenerAboutUseCase.execute();
      if (!resultado) {
        res.status(404).json({
          success: false,
          data: { code: 'NOT_FOUND', details: [], requestId: crypto.randomUUID() },
          message: 'Recurso no encontrado',
        });
        return;
      }
      writeSuccess(res, resultado, 'Documento Nosotros');
    } catch (error) {
      next(error);
    }
  };
