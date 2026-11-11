import { z } from 'zod';

import type { ListarServicesUseCase } from '../../../application/use-cases/services/listar-services';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';

const querySchema = z.object({});

/**
 * GET /api/v1/services — Listado público de servicios.
 * Solo devuelve servicios `ACTIVE`. No requiere sesión.
 */
export const makeListServicesHandler =
  (listarServicesUseCase: ListarServicesUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      querySchema.parse(req.query);
      const resultado = await listarServicesUseCase.execute();
      writeSuccess(res, resultado, 'Listado de servicios');
    } catch (error) {
      next(error);
    }
  };
