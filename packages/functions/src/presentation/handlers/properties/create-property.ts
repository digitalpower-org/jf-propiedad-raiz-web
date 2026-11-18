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
  estrato: z.number().int().min(1).max(6).optional(),
  predial: z.string().min(1).optional(),
  administracion: z.string().min(1).optional(),
  acabados: translatableSchema.optional(),
  antiguedad: z.string().min(1).optional(),
  areaConstruida: z.number().positive().optional(),
  areaLote: z.number().positive().optional(),
  dormitorios: z.number().int().nonnegative().optional(),
  banos: z.number().int().nonnegative().optional(),
  parqueaderos: z.number().int().nonnegative().optional(),
  deposito: z.number().int().nonnegative().optional(),
  amenidades: z.array(z.string()).optional(),
  puntosInteres: z
    .array(
      z.object({
        categoria: z.string().optional(),
        etiqueta: translatableSchema,
      }),
    )
    .optional(),
  fotos: z
    .array(
      z.object({
        derivados: z
          .array(
            z.object({
              clave: z.string().min(1),
              ancho: z.number().int().positive(),
              alto: z.number().int().positive(),
            }),
          )
          .nonempty(),
      }),
    )
    .optional(),
  videos: z.array(z.string()).optional(),
  panoramas: z
    .array(
      z.object({
        derivados: z
          .array(
            z.object({
              clave: z.string().min(1),
              ancho: z.number().int().positive(),
              alto: z.number().int().positive(),
            }),
          )
          .nonempty(),
      }),
    )
    .max(3)
    .refine(
      (panoramas) =>
        panoramas.every((p) =>
          p.derivados.every((d) => d.ancho / d.alto >= 1.98 && d.ancho / d.alto <= 2.02),
        ),
      {
        message: 'Cada derivado de una panorámica debe tener proporción 2:1 ±1 %',
      },
    )
    .optional(),
  destacada: z.boolean().optional(),
  proyecto: z
    .object({
      etapa: translatableSchema.optional(),
      fechaEntregaEstimada: z.string().optional(),
      unidadesDisponibles: z.number().int().nonnegative().optional(),
    })
    .optional(),
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
    ...(body.estrato !== undefined ? { estrato: body.estrato } : {}),
    ...(body.predial !== undefined ? { predial: body.predial } : {}),
    ...(body.administracion !== undefined ? { administracion: body.administracion } : {}),
    ...(body.acabados !== undefined ? { acabados: body.acabados } : {}),
    ...(body.antiguedad !== undefined ? { antiguedad: body.antiguedad } : {}),
    ...(body.areaConstruida !== undefined ? { areaConstruida: body.areaConstruida } : {}),
    ...(body.areaLote !== undefined ? { areaLote: body.areaLote } : {}),
    ...(body.dormitorios !== undefined ? { dormitorios: body.dormitorios } : {}),
    ...(body.banos !== undefined ? { banos: body.banos } : {}),
    ...(body.parqueaderos !== undefined ? { parqueaderos: body.parqueaderos } : {}),
    ...(body.deposito !== undefined ? { deposito: body.deposito } : {}),
    ...(body.amenidades !== undefined ? { amenidades: body.amenidades } : {}),
    ...(body.puntosInteres !== undefined ? { puntosInteres: body.puntosInteres } : {}),
    ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
    ...(body.videos !== undefined ? { videos: body.videos } : {}),
    ...(body.panoramas !== undefined ? { panoramas: body.panoramas } : {}),
    ...(body.descripcion
      ? {
          descripcion:
            body.descripcion.en !== undefined
              ? { es: body.descripcion.es, en: body.descripcion.en }
              : { es: body.descripcion.es },
        }
      : {}),
    ...(body.destacada !== undefined ? { destacada: body.destacada } : {}),
    ...(body.proyecto !== undefined ? { proyecto: body.proyecto } : {}),
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
