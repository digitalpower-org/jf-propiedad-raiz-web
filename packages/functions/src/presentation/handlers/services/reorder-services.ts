import { z } from 'zod';

import type {
  ReordenarServiceUseCase,
  ReordenarServiceCommand,
} from '../../../application/use-cases/services/reordenar-services';
import { writeSuccess } from '../../protocol';
import { MSG_SERVICE_REORDERED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const bodySchema = z.object({
  orden: z.array(z.string().min(1)).nonempty(),
});

/**
 * POST /api/v1/services/reorder — Reordenar el listado de servicios.
 * Requiere sesión de admin. Persiste `orden` y dispara la revalidación (US0.3).
 */
export const makeReorderServiceHandler =
  (useCase: ReordenarServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);
      const items = body.orden.map((id, orden) => ({ id, orden }));

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: ReordenarServiceCommand = { items, requestId };
      await useCase.execute(command);

      writeSuccess(res, { orden: body.orden }, MSG_SERVICE_REORDERED);
    } catch (error) {
      next(error);
    }
  };
