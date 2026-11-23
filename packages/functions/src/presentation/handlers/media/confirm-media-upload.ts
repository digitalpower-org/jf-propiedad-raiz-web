import { z } from 'zod';

import type {
  ConfirmarMediaUploadUseCase,
  ConfirmarMediaUploadCommand,
} from '../../../application/use-cases/media/confirmar-media-upload';
import { writeSuccess } from '../../protocol';
import { MSG_MEDIA_CONFIRMED } from '../../messages';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

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
  (useCase: ConfirmarMediaUploadUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);

      // Validar prefijo pending/ antes de cualquier llamada a HEAD/GET o procesamiento
      if (!body.key.startsWith('pending/')) {
        throw new ApiError(
          errorCode.validationError,
          'Clave inválida: debe comenzar con pending/',
          [{ field: 'key', issue: 'La clave debe estar en pending/' }],
        );
      }

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
