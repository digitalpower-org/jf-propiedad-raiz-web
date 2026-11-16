import { z } from 'zod';

import type { RateLimiter, RateLimitedError } from '../../../application/ports/rate-limiter';
import type {
  PresignMediaUploadUseCase,
  PresignMediaUploadCommand,
} from '../../../application/use-cases/media/presign-media-upload';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import { MSG_MEDIA_PRESIGNED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const bodySchema = z.object({
  nombre: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

/**
 * POST /api/v1/media/presigned-url — Firmar una URL PUT presignada en R2 (prefijo `pending/`).
 * Requiere sesión de admin. Valida el rol y el tipo MIME antes de firmar (US1.8).
 */
export const makePresignMediaUploadHandler =
  (useCase: PresignMediaUploadUseCase, rateLimiter: RateLimiter): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = res.locals.userIdentity?.uid ?? 'media-presign';
      try {
        await rateLimiter.check(`media-presign:${key}`, 60, 60);
      } catch (error) {
        if ((error as RateLimitedError).code === 'RATE_LIMITED') {
          throw new ApiError(errorCode.rateLimited, 'Límite de solicitudes excedido');
        }
        throw error;
      }

      const body = bodySchema.parse(req.body);

      const command: PresignMediaUploadCommand = {
        nombre: body.nombre,
        mimeType: body.mimeType,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado, MSG_MEDIA_PRESIGNED);
    } catch (error) {
      next(error);
    }
  };
