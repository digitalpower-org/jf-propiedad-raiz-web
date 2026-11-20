import { z } from 'zod';

import type {
  ActualizarPropertyUseCase,
  ActualizarPropertyCommand,
} from '../../../application/use-cases/properties/actualizar-property';
import type { ActualizarPropertyInputDto } from '../../../application/ports/properties-repository';
import type { PuntoInteresCategoria } from '@jf/shared-types';
import { OPERACIONES } from '../../../domain/value-objects/operacion';
import { TIPOS_INMUEBLE } from '../../../domain/value-objects/tipo-propiedad';
import {
  translatableInputSchema,
  optionalClearableTranslatableInputSchema,
} from '../../schemas/translatable';
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
  titulo: translatableInputSchema.optional(),
  descripcion: optionalClearableTranslatableInputSchema,
  precio: z.number().int().positive().optional(),
  departamento: z.string().min(1).optional(),
  municipio: z.string().min(1).optional(),
  estrato: z.number().int().min(1).max(6).optional(),
  predial: z.string().min(1).optional(),
  administracion: z.string().min(1).optional(),
  acabados: optionalClearableTranslatableInputSchema,
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
        etiqueta: translatableInputSchema,
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
      etapa: optionalClearableTranslatableInputSchema,
      fechaEntregaEstimada: z.string().optional(),
      unidadesDisponibles: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

/**
 * Construye el DTO de entrada para actualizar un inmueble a partir del
 * cuerpo de petición ya validado por Zod.
 * Copia `autoTranslate` con spreads condicionales; nunca copia `enPendiente`.
 */
function buildUpdatePropertyInput(body: z.infer<typeof bodySchema>): ActualizarPropertyInputDto {
  return {
    ...(body.operacion !== undefined ? { operacion: body.operacion } : {}),
    ...(body.tipo !== undefined ? { tipo: body.tipo } : {}),
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
    ...(body.descripcion !== undefined
      ? {
          descripcion: {
            es: body.descripcion.es,
            ...(body.descripcion.en !== undefined ? { en: body.descripcion.en } : {}),
            ...(body.descripcion.autoTranslate !== undefined
              ? { autoTranslate: body.descripcion.autoTranslate }
              : {}),
          },
        }
      : {}),
    ...(body.precio !== undefined ? { precio: body.precio } : {}),
    ...(body.departamento !== undefined ? { departamento: body.departamento } : {}),
    ...(body.municipio !== undefined ? { municipio: body.municipio } : {}),
    ...(body.estrato !== undefined ? { estrato: body.estrato } : {}),
    ...(body.predial !== undefined ? { predial: body.predial } : {}),
    ...(body.administracion !== undefined ? { administracion: body.administracion } : {}),
    ...(body.acabados !== undefined
      ? {
          acabados: {
            es: body.acabados.es,
            ...(body.acabados.en !== undefined ? { en: body.acabados.en } : {}),
            ...(body.acabados.autoTranslate !== undefined
              ? { autoTranslate: body.acabados.autoTranslate }
              : {}),
          },
        }
      : {}),
    ...(body.antiguedad !== undefined ? { antiguedad: body.antiguedad } : {}),
    ...(body.areaConstruida !== undefined ? { areaConstruida: body.areaConstruida } : {}),
    ...(body.areaLote !== undefined ? { areaLote: body.areaLote } : {}),
    ...(body.dormitorios !== undefined ? { dormitorios: body.dormitorios } : {}),
    ...(body.banos !== undefined ? { banos: body.banos } : {}),
    ...(body.parqueaderos !== undefined ? { parqueaderos: body.parqueaderos } : {}),
    ...(body.deposito !== undefined ? { deposito: body.deposito } : {}),
    ...(body.amenidades !== undefined ? { amenidades: body.amenidades } : {}),
    ...(body.puntosInteres !== undefined
      ? {
          puntosInteres: body.puntosInteres.map((pi) =>
            pi.categoria !== undefined
              ? { categoria: pi.categoria as PuntoInteresCategoria, etiqueta: pi.etiqueta }
              : { etiqueta: pi.etiqueta },
          ),
        }
      : {}),
    ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
    ...(body.videos !== undefined ? { videos: body.videos } : {}),
    ...(body.panoramas !== undefined ? { panoramas: body.panoramas } : {}),
    ...(body.destacada !== undefined ? { destacada: body.destacada } : {}),
    ...(body.proyecto !== undefined
      ? {
          proyecto: {
            ...(body.proyecto.etapa !== undefined
              ? {
                  etapa: {
                    es: body.proyecto.etapa.es,
                    ...(body.proyecto.etapa.en !== undefined ? { en: body.proyecto.etapa.en } : {}),
                    ...(body.proyecto.etapa.autoTranslate !== undefined
                      ? { autoTranslate: body.proyecto.etapa.autoTranslate }
                      : {}),
                  },
                }
              : {}),
            ...(body.proyecto.fechaEntregaEstimada !== undefined
              ? { fechaEntregaEstimada: body.proyecto.fechaEntregaEstimada }
              : {}),
            ...(body.proyecto.unidadesDisponibles !== undefined
              ? { unidadesDisponibles: body.proyecto.unidadesDisponibles }
              : {}),
          },
        }
      : {}),
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
      const params = paramsSchema.parse(req.params);
      const body = bodySchema.parse(req.body);

      const input = buildUpdatePropertyInput(body);

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: ActualizarPropertyCommand = {
        idOrSlug: params.idOrSlug,
        input,
        requestId,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_UPDATED);
    } catch (error) {
      next(error);
    }
  };
