import { z } from 'zod';

import type {
  ActualizarServiceUseCase,
  ActualizarServiceCommand,
} from '../../../application/use-cases/services/actualizar-services';
import type { ActualizarServiceInputDto } from '../../../application/ports/services-repository';
import { translatableInputSchema } from '../../schemas/translatable';
import { MSG_SERVICE_UPDATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

const fotoSchema = z.object({
  derivados: z
    .array(
      z.object({
        clave: z.string().min(1),
        ancho: z.number().int().positive(),
        alto: z.number().int().positive(),
      }),
    )
    .nonempty(),
});

const bodySchema = z.object({
  titulo: translatableInputSchema.optional(),
  resumen: translatableInputSchema.optional(),
  cuerpo: translatableInputSchema.optional(),
  fotos: z.array(fotoSchema).optional(),
  orden: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'HIDDEN', 'DELETED'] as const).optional(),
});

/**
 * Construye el DTO de entrada para actualizar un servicio a partir del
 * cuerpo de petición ya validado por Zod.
 * Copia `autoTranslate` con spreads condicionales; nunca copia `enPendiente`.
 */
function buildActualizarServiceInput(body: z.infer<typeof bodySchema>): ActualizarServiceInputDto {
  return {
    ...(body.titulo
      ? {
          titulo: {
            es: body.titulo.es,
            ...(body.titulo.en !== undefined ? { en: body.titulo.en } : {}),
            ...(body.titulo.autoTranslate !== undefined
              ? { autoTranslate: body.titulo.autoTranslate }
              : {}),
          },
        }
      : {}),
    ...(body.resumen
      ? {
          resumen: {
            es: body.resumen.es,
            ...(body.resumen.en !== undefined ? { en: body.resumen.en } : {}),
            ...(body.resumen.autoTranslate !== undefined
              ? { autoTranslate: body.resumen.autoTranslate }
              : {}),
          },
        }
      : {}),
    ...(body.cuerpo
      ? {
          cuerpo: {
            es: body.cuerpo.es,
            ...(body.cuerpo.en !== undefined ? { en: body.cuerpo.en } : {}),
            ...(body.cuerpo.autoTranslate !== undefined
              ? { autoTranslate: body.cuerpo.autoTranslate }
              : {}),
          },
        }
      : {}),
    ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
    ...(body.orden !== undefined ? { orden: body.orden } : {}),
    ...(body.status !== undefined ? { status: body.status } : {}),
  };
}

/**
 * PUT /api/v1/services/{idOrSlug} — Actualizar un servicio.
 * Requiere sesión de admin. Concurrencia optimista por `updatedAt` (409 si stale).
 * Tras guardar se dispara la revalidación (US0.3).
 */
export const makeUpdateServiceHandler =
  (useCase: ActualizarServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);
      const input = buildActualizarServiceInput(body);

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: ActualizarServiceCommand = {
        idOrSlug: params.idOrSlug,
        input,
        requestId,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.service, MSG_SERVICE_UPDATED);
    } catch (error) {
      next(error);
    }
  };
