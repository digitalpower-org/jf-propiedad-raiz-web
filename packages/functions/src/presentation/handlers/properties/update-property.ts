import { z } from 'zod';

import type {
  ActualizarPropertyUseCase,
  ActualizarPropertyCommand,
} from '../../../application/use-cases/properties/actualizar-property';
import type { ActualizarPropertyInputDto } from '../../../application/ports/properties-repository';
import { OPERACIONES } from '../../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../../domain/value-objects/tipo-propiedad';
import { translatableSchema, optionalTranslatableSchema } from '../../schemas/translatable';
import { MSG_PROPERTY_UPDATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

const bodySchema = z.object({
  operacion: z.enum(OPERACIONES).optional(),
  tipo: z.enum(TIPOS_INMUEBLE).optional(),
  titulo: translatableSchema.optional(),
  descripcion: optionalTranslatableSchema,
  precio: z.number().int().positive().optional(),
  departamento: z.string().min(1).optional(),
  municipio: z.string().min(1).optional(),
});

/**
 * Construye el DTO de entrada para actualizar un inmueble a partir del
 * cuerpo de petición ya validado por Zod.
 */
function buildUpdatePropertyInput(
  body: z.infer<typeof bodySchema>,
): ActualizarPropertyInputDto {
  return {
    ...(body.operacion !== undefined ? { operacion: body.operacion } : {}),
    ...(body.tipo !== undefined ? { tipo: body.tipo } : {}),
    ...(body.titulo
      ? {
          titulo: {
            es: body.titulo.es,
            ...(body.titulo.en !== undefined ? { en: body.titulo.en } : {}),
          },
        }
      : {}),
    ...(body.descripcion
      ? {
          descripcion: {
            es: body.descripcion.es,
            ...(body.descripcion.en !== undefined
              ? { en: body.descripcion.en }
              : {}),
          },
        }
      : {}),
    ...(body.precio !== undefined ? { precio: body.precio } : {}),
    ...(body.departamento !== undefined
      ? { departamento: body.departamento }
      : {}),
    ...(body.municipio !== undefined ? { municipio: body.municipio } : {}),
  };
}

/**
 * PUT /api/v1/properties/{idOrSlug} — Actualizar un inmueble (edición del admin).
 * Requiere sesión de admin. Control de concurrencia optimista por `updatedAt`.
 * Tras guardar se traducen campos con `autoTranslate` y se revalida (US0.3).
 */
export const makeUpdatePropertyHandler =
  (useCase: ActualizarPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      z.object({
        'x-user-id': z.string().min(1),
        'x-user-role': z.string().min(1),
        'x-user-email': z.string().email().optional(),
      }).parse(req.headers);
      const params = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);

      const input = buildUpdatePropertyInput(body);

      const command: ActualizarPropertyCommand = {
        idOrSlug: params.idOrSlug,
        input,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_UPDATED);
    } catch (error) {
      next(error);
    }
  };
