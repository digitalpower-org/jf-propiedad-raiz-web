import { z } from 'zod';

import type {
  CrearServiceUseCase,
  CrearServiceCommand,
} from '../../../application/use-cases/services/crear-services';
import type { CrearServiceInputDto } from '../../../application/ports/services-repository';
import { translatableInputSchema } from '../../schemas/translatable';
import { MSG_SERVICE_CREATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

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
  titulo: translatableInputSchema,
  resumen: translatableInputSchema,
  cuerpo: translatableInputSchema,
  fotos: z.array(fotoSchema).optional(),
  orden: z.number().int().nonnegative().optional(),
});

/**
 * Construye el DTO de entrada para crear un servicio a partir del
 * cuerpo de petición ya validado por Zod.
 * Copia `autoTranslate` con spreads condicionales; nunca copia `enPendiente`.
 */
function buildCrearServiceInput(body: z.infer<typeof bodySchema>): CrearServiceInputDto {
  return {
    titulo: {
      es: body.titulo.es,
      ...(body.titulo.en !== undefined ? { en: body.titulo.en } : {}),
      ...(body.titulo.autoTranslate !== undefined
        ? { autoTranslate: body.titulo.autoTranslate }
        : {}),
    },
    resumen: {
      es: body.resumen.es,
      ...(body.resumen.en !== undefined ? { en: body.resumen.en } : {}),
      ...(body.resumen.autoTranslate !== undefined
        ? { autoTranslate: body.resumen.autoTranslate }
        : {}),
    },
    cuerpo: {
      es: body.cuerpo.es,
      ...(body.cuerpo.en !== undefined ? { en: body.cuerpo.en } : {}),
      ...(body.cuerpo.autoTranslate !== undefined
        ? { autoTranslate: body.cuerpo.autoTranslate }
        : {}),
    },
    ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
    ...(body.orden !== undefined ? { orden: body.orden } : {}),
  };
}

/**
 * POST /api/v1/services — Crear un servicio (estado inicial HIDDEN).
 * Requiere sesión de admin. El slug se deriva del título en el caso de uso.
 * Tras guardar se dispara la revalidación (US0.3).
 */
export const makeCreateServiceHandler =
  (useCase: CrearServiceUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);
      const input = buildCrearServiceInput(body);

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: CrearServiceCommand = { input, requestId };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.service, MSG_SERVICE_CREATED, 201);
    } catch (error) {
      next(error);
    }
  };
