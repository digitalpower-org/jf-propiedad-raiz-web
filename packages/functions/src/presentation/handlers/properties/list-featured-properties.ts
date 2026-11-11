import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';
import type { ListarFeaturedPropertiesUseCase } from '../../../application/use-cases/properties/listar-featured-properties';

/**
 * GET /api/v1/properties/featured — Propiedades destacadas para el inicio.
 * No requiere sesión ni parámetros de query.
 */
export const makeListFeaturedPropertiesHandler =
  (listarFeaturedPropertiesUseCase: ListarFeaturedPropertiesUseCase): AsyncHandler =>
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const resultado = await listarFeaturedPropertiesUseCase.execute();
      writeSuccess(res, resultado, 'Propiedades destacadas');
    } catch (error) {
      next(error);
    }
  };
