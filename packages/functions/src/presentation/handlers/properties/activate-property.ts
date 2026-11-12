import { z } from 'zod';

import type {
  ActivarPropertyUseCase,
  ActivarPropertyCommand,
} from '../../../application/use-cases/properties/activar-property';
import { writeSuccess } from '../../protocol';
import { MSG_PROPERTY_ACTIVATED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

/**
 * POST /api/v1/properties/{idOrSlug}/activate — Activar un inmueble (HIDDEN → ACTIVE).
 * Requiere sesión de admin. Valida campos obligatorios (AC1.7.3) y precio > 0 (AC1.7.4).
 * La primera activación fija `fechaPublicacion` (AC1.7.5). Se revalida (US0.3).
 */
export const makeActivatePropertyHandler =
  (useCase: ActivarPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const command: ActivarPropertyCommand = {
        idOrSlug: params.idOrSlug,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_ACTIVATED);
    } catch (error) {
      next(error);
    }
  };
