import { z } from 'zod';

import type {
  CrearPropertyUseCase,
  CrearPropertyCommand,
} from '../../../application/use-cases/properties/crear-property';
import type { CrearPropertyInputDto } from '../../../application/ports/properties-repository';
import { createPropertyInputSchema } from '../../schemas/property-input';
import { MSG_PROPERTY_CREATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const bodySchema = createPropertyInputSchema;

/**
 * Construye el DTO de entrada para crear un inmueble a partir del
 * cuerpo de petición ya validado por Zod.
 * Copia `autoTranslate` con spreads condicionales; nunca copia `enPendiente`.
 */
function buildCreatePropertyInput(body: z.infer<typeof bodySchema>): CrearPropertyInputDto {
  return {
    operacion: body.operacion,
    tipo: body.tipo,
    titulo: {
      es: body.titulo.es,
      ...(body.titulo.en !== undefined ? { en: body.titulo.en } : {}),
      ...(body.titulo.autoTranslate !== undefined
        ? { autoTranslate: body.titulo.autoTranslate }
        : {}),
    },
    precio: body.precio,
    departamento: body.departamento,
    municipio: body.municipio,
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
              ? { categoria: pi.categoria, etiqueta: pi.etiqueta }
              : { etiqueta: pi.etiqueta },
          ),
        }
      : {}),
    ...(body.fotos !== undefined ? { fotos: body.fotos } : {}),
    ...(body.videos !== undefined ? { videos: body.videos } : {}),
    ...(body.panoramas !== undefined ? { panoramas: body.panoramas } : {}),
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
 * POST /api/v1/properties — Crear un inmueble (estado inicial HIDDEN).
 * Requiere sesión de admin (X-User-*). Tras la escritura se revalida (US0.3).
 */
export const makeCreatePropertyHandler =
  (useCase: CrearPropertyUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = bodySchema.parse(req.body);

      const input = buildCreatePropertyInput(body);

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: CrearPropertyCommand = { input, requestId };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_CREATED, 201);
    } catch (error) {
      next(error);
    }
  };
