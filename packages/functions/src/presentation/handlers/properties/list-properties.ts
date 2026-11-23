import { z } from 'zod';

import type { ListarPropertiesUseCase } from '../../../application/use-cases/properties/listar-properties';
import type { FiltrosListadoPublico } from '../../../application/ports/properties-repository';
import { OPERACIONES } from '../../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../../domain/value-objects/tipo-propiedad';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const querySchema = z
  .object({
    operacion: z.enum(OPERACIONES),
    destacada: z.enum(['true', 'false']).transform((v) => v === 'true'),
    tipo: z.enum(TIPOS_INMUEBLE).optional(),
    departamento: z.string().optional(),
    municipio: z.string().optional(),
    precioMin: z.coerce.number().int().positive().optional(),
    precioMax: z.coerce.number().int().positive().optional(),
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    includeHidden: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .refine(
    (data) =>
      data.precioMin === undefined ||
      data.precioMax === undefined ||
      data.precioMin <= data.precioMax,
    { message: 'precioMin no puede ser mayor que precioMax', path: ['precioMin'] },
  )
  .refine((data) => (data.departamento !== undefined) === (data.municipio !== undefined), {
    message: 'departamento y municipio deben enviarse juntos',
    path: ['departamento'],
  })
  .refine((data) => (data.precioMin !== undefined) === (data.precioMax !== undefined), {
    message: 'precioMin y precioMax deben enviarse juntos',
    path: ['precioMin'],
  })
  .refine(
    (data) => {
      // Validar que la combinación de filtros sea uno de los 8 presets válidos.
      // Excluimos cursor, limit, includeHidden de la membresía del preset.
      const hasTipo = data.tipo !== undefined;
      const hasUbicacion = data.departamento !== undefined && data.municipio !== undefined;
      const hasRangoPrecio = data.precioMin !== undefined && data.precioMax !== undefined;

      // Los 8 presets válidos (base 1 = operacion + destacada, siempre presentes):
      // 1: solo base
      // 1+2: base + rangoPrecio
      // 1+3: base + tipo
      // 1+4: base + ubicacion
      // 1+2+3: base + rangoPrecio + tipo
      // 1+2+4: base + rangoPrecio + ubicacion
      // 1+3+4: base + tipo + ubicacion
      // 1+2+3+4: base + rangoPrecio + tipo + ubicacion
      const presetValidos = new Set([
        '1',
        '1+2',
        '1+3',
        '1+4',
        '1+2+3',
        '1+2+4',
        '1+3+4',
        '1+2+3+4',
      ]);

      const partes = ['1'];
      if (hasRangoPrecio) partes.push('2');
      if (hasTipo) partes.push('3');
      if (hasUbicacion) partes.push('4');
      const preset = partes.join('+');

      return presetValidos.has(preset);
    },
    {
      message:
        'Combinación de filtros no válida; debe corresponder a uno de los 8 presets documentados',
      path: ['tipo'],
    },
  );

/**
 * Construye el objeto de filtros para listado público a partir del
 * cuerpo de consulta ya validado por Zod.
 */
function buildFiltrosListadoPublico(raw: z.infer<typeof querySchema>): FiltrosListadoPublico {
  return {
    operacion: raw.operacion,
    destacada: raw.destacada,
    ...(raw.tipo !== undefined ? { tipo: raw.tipo } : {}),
    ...(raw.departamento !== undefined ? { departamento: raw.departamento } : {}),
    ...(raw.municipio !== undefined ? { municipio: raw.municipio } : {}),
    ...(raw.precioMin !== undefined ? { precioMin: raw.precioMin } : {}),
    ...(raw.precioMax !== undefined ? { precioMax: raw.precioMax } : {}),
    ...(raw.cursor !== undefined ? { cursor: raw.cursor } : {}),
    ...(raw.limit !== undefined ? { limit: raw.limit } : {}),
    ...(raw.includeHidden !== undefined ? { includeHidden: raw.includeHidden } : {}),
  };
}

/**
 * GET /api/v1/properties — Listado público de inmuebles con filtros y paginación por cursor.
 * Solo devuelve inmuebles `ACTIVE`. No requiere sesión.
 * Si `includeHidden=true` y hay sesión admin válida, incluye inmuebles `HIDDEN`.
 */
export const makeListPropertiesHandler =
  (useCase: ListarPropertiesUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filtrosRaw = querySchema.parse(req.query);

      if (filtrosRaw.includeHidden === true && !res.locals.userIdentity) {
        throw new ApiError(
          errorCode.unauthorized,
          'Se requiere sesión de administrador para ver inmuebles ocultos',
        );
      }

      const includeHidden = filtrosRaw.includeHidden === true && !!res.locals.userIdentity;
      const filtros = buildFiltrosListadoPublico({
        ...filtrosRaw,
        includeHidden,
      });
      const resultado = await useCase.execute(filtros);

      writeSuccess(res, resultado, 'Listado de inmuebles');
    } catch (error) {
      next(error);
    }
  };
