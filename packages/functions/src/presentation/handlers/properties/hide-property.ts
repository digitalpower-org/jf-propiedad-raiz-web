import { z } from 'zod';

import type {
  OcultarPropertyUseCase,
  OcultarPropertyCommand,
} from '../../../application/use-cases/properties/ocultar-property';
import { writeSuccess } from '../../protocol';
import { MSG_PROPERTY_HIDDEN } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * POST /api/v1/properties/{idOrSlug}/hide — Ocultar un inmueble (ACTIVE → HIDDEN).
 * Requiere sesión de admin. No cambia `fechaPublicacion` (AC1.7.5). Se revalida (US0.3).
 */
export const makeHidePropertyHandler =
  (useCase: OcultarPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: OcultarPropertyCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_HIDDEN);
    } catch (error) {
      next(error);
    }
  };
