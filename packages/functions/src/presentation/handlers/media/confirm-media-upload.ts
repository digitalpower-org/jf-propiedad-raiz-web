import { z } from 'zod';

import type { RateLimiter, RateLimitedError } from '../../../application/ports/rate-limiter';
import type {
  ConfirmarMediaUploadUseCase,
  ConfirmarMediaUploadCommand,
} from '../../../application/use-cases/media/confirmar-media-upload';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import { MSG_MEDIA_CONFIRMED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const bodySchema = z.object({
  key: z.string().min(1),
  recurso: z.enum(['foto', 'panorama']),
});

/**
 * POST /api/v1/media/confirm — Confirmar subida, validar por cabecera y generar derivados WebP.
 * Requiere sesión de admin. Valida tipo → peso → dimensiones mínimas → tope de píxeles → proporción.
 * Genera derivados y elimina el original de `pending/` (US1.9).
 */
export const makeConfirmarMediaUploadHandler =
  (useCase: ConfirmarMediaUploadUseCase, rateLimiter: RateLimiter): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = res.locals.userIdentity?.uid ?? 'media-confirm';
      try {
        await rateLimiter.check(`media-confirm:${key}`, 60, 60);
      } catch (error) {
        if ((error as RateLimitedError).code === 'RATE_LIMITED') {
          throw new ApiError(errorCode.rateLimited, 'Límite de solicitudes excedido');
        }
        throw error;
      }

      const body = bodySchema.parse(req.body);

      const command: ConfirmarMediaUploadCommand = {
        key: body.key,
        recurso: body.recurso,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado, MSG_MEDIA_CONFIRMED);
    } catch (error) {
      next(error);
    }
  };
