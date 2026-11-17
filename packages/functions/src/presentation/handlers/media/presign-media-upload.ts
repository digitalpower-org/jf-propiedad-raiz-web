import { z } from 'zod';

import type {
  PresignMediaUploadUseCase,
  PresignMediaUploadCommand,
} from '../../../application/use-cases/media/presign-media-upload';
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
  (useCase: PresignMediaUploadUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
