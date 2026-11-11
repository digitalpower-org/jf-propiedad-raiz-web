import { z } from 'zod';

import type { ListarPropertiesUseCase } from '../../../application/use-cases/properties/listar-properties';
import type { FiltrosListadoPublico } from '../../../application/ports/properties-repository';
import { OPERACIONES } from '../../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../../domain/value-objects/tipo-propiedad';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const querySchema = z.object({
  operacion: z.enum(OPERACIONES),
  destacada: z.enum(['true', 'false']).transform((v) => v === 'true'),
  tipo: z.enum(TIPOS_INMUEBLE).optional(),
  departamento: z.string().optional(),
  municipio: z.string().optional(),
  precioMin: z.coerce.number().int().positive().optional(),
  precioMax: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

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
  };
}

/**
 * GET /api/v1/properties — Listado público de inmuebles con filtros y paginación por cursor.
 * Solo devuelve inmuebles `ACTIVE`. No requiere sesión.
 */
export const makeListPropertiesHandler =
  (useCase: ListarPropertiesUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filtrosRaw = querySchema.parse(req.query);
      const filtros = buildFiltrosListadoPublico(filtrosRaw);
      const resultado = await useCase.execute(filtros);

      writeSuccess(res, resultado, 'Listado de inmuebles');
    } catch (error) {
      next(error);
    }
  };
