import { z } from 'zod';

import type { ListarFeaturedPropertiesUseCase } from '../../../application/use-cases/properties/listar-featured-properties';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';

const querySchema = z.object({}).strict();

/**
 * GET /api/v1/properties/featured — Propiedades destacadas para el inicio.
 */
export const makeListFeaturedPropertiesHandler =
  (listarFeaturedPropertiesUseCase: ListarFeaturedPropertiesUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      querySchema.parse(req.query);
      const resultado = await listarFeaturedPropertiesUseCase.execute();
      writeSuccess(res, resultado, 'Propiedades destacadas');
    } catch (error) {
      next(error);
    }
  };
