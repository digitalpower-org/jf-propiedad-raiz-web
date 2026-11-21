import { z } from 'zod';

import type {
  ActualizarAboutUseCase,
  ActualizarAboutCommand,
} from '../../../application/use-cases/about/actualizar-about';
import type { AboutDtoInput } from '../../../application/ports/about-repository';
import { translatableInputSchema } from '../../schemas/translatable';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const seccionSchema = z
  .object({
    id: z.string().min(1),
    titulo: translatableInputSchema,
    cuerpo: translatableInputSchema,
  })
  .strict();

const integranteSchema = z
  .object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    cargo: translatableInputSchema,
    descripcion: translatableInputSchema.optional(),
    foto: z.string().optional(),
  })
  .strict();

const bodySchema = z
  .object({
    titulo: translatableInputSchema,
    extracto: translatableInputSchema.refine((data) => data.es.length <= 500, {
      message: 'El extracto no puede exceder 500 caracteres',
      path: ['es'],
    }),
    secciones: z.array(seccionSchema),
    equipo: z.array(integranteSchema),
    updatedAt: z.string().min(1),
  })
  .strict();

/**
 * Construye el `AboutDtoInput` a partir del cuerpo ya validado por Zod.
 * `updatedAt` se excluye: viaja como `expectedUpdatedAt` del comando de concurrencia.
 */
function buildActualizarAboutInput(body: z.infer<typeof bodySchema>): AboutDtoInput {
  const translatable = (field: {
    readonly es: string;
    readonly en?: string;
    readonly autoTranslate?: boolean;
  }) => ({
    es: field.es,
    ...(field.en !== undefined ? { en: field.en } : {}),
    ...(field.autoTranslate !== undefined ? { autoTranslate: field.autoTranslate } : {}),
  });

  return {
    titulo: translatable(body.titulo),
    extracto: translatable(body.extracto),
    secciones: body.secciones.map((seccion) => ({
      id: seccion.id,
      titulo: translatable(seccion.titulo),
      cuerpo: translatable(seccion.cuerpo),
    })),
    equipo: body.equipo.map((integrante) => ({
      id: integrante.id,
      nombre: integrante.nombre,
      cargo: translatable(integrante.cargo),
      ...(integrante.descripcion !== undefined
        ? { descripcion: translatable(integrante.descripcion) }
        : {}),
      ...(integrante.foto !== undefined ? { foto: integrante.foto } : {}),
    })),
  };
}

/**
 * PUT /api/v1/about — Actualizar documento Nosotros.
 * Requiere sesión de admin. Valida extracto.es ≤ 500 (422), concurrencia optimista por
 * updatedAt (409 si stale). Tras guardar se dispara la revalidación (US0.3).
 */
export const makeUpdateAboutHandler =
  (useCase: ActualizarAboutUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);
      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: ActualizarAboutCommand = {
        input: buildActualizarAboutInput(body),
        expectedUpdatedAt: body.updatedAt,
        requestId,
      };
      const resultado = await useCase.execute(command);
      writeSuccess(res, resultado, 'About actualizado');
    } catch (error) {
      next(error);
    }
  };
