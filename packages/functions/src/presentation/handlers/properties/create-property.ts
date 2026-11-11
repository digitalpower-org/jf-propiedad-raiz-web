import { z } from 'zod';

import type {
  CrearPropertyUseCase,
  CrearPropertyCommand,
} from '../../../application/use-cases/properties/crear-property';
import type { CrearPropertyInputDto } from '../../../application/ports/properties-repository';
import { OPERACIONES } from '../../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../../domain/value-objects/tipo-propiedad';
import { translatableSchema, optionalTranslatableSchema } from '../../schemas/translatable';
import { MSG_PROPERTY_CREATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const bodySchema = z.object({
  operacion: z.enum(OPERACIONES),
  tipo: z.enum(TIPOS_INMUEBLE),
  titulo: translatableSchema,
  descripcion: optionalTranslatableSchema,
  precio: z.number().int().positive(),
  departamento: z.string().min(1),
  municipio: z.string().min(1),
});

/**
 * Construye el DTO de entrada para crear un inmueble a partir del
 * cuerpo de petición ya validado por Zod.
 */
function buildCreatePropertyInput(body: z.infer<typeof bodySchema>): CrearPropertyInputDto {
  return {
    operacion: body.operacion,
    tipo: body.tipo,
    titulo:
      body.titulo.en !== undefined
        ? { es: body.titulo.es, en: body.titulo.en }
        : { es: body.titulo.es },
    precio: body.precio,
    departamento: body.departamento,
    municipio: body.municipio,
    ...(body.descripcion
      ? {
          descripcion:
            body.descripcion.en !== undefined
              ? { es: body.descripcion.es, en: body.descripcion.en }
              : { es: body.descripcion.es },
        }
      : {}),
  };
}

/**
 * POST /api/v1/properties — Crear un inmueble (estado inicial HIDDEN).
 * Requiere sesión de admin (X-User-*). Tras la escritura se revalida (US0.3).
 */
export const makeCreatePropertyHandler =
  (useCase: CrearPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);

      const input = buildCreatePropertyInput(body);

      const command: CrearPropertyCommand = { input };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_CREATED, 201);
    } catch (error) {
      next(error);
    }
  };
