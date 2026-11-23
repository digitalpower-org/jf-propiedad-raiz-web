import { z } from 'zod';

import type {
  ActualizarPropertyUseCase,
  ActualizarPropertyCommand,
} from '../../../application/use-cases/properties/actualizar-property';
import type { ActualizarPropertyInputDto } from '../../../application/ports/properties-repository';
import { updatePropertyInputSchema } from '../../schemas/property-input';
import { MSG_PROPERTY_UPDATED } from '../../messages';
import { writeSuccess } from '../../protocol';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

const paramsSchema = z.object({
  idOrSlug: z.string().min(1),
});

const bodySchema = updatePropertyInputSchema.extend({
  updatedAt: z.string().datetime({ offset: true }),
});

/**
 * Construye el DTO de entrada para actualizar un inmueble a partir del
 * cuerpo de petición ya validado por Zod.
 * Copia `autoTranslate` con spreads condicionales; nunca copia `enPendiente`.
 * Devuelve también el `expectedUpdatedAt` para control de concurrencia optimista.
 */
function buildUpdatePropertyInput(body: z.infer<typeof bodySchema>): {
  input: ActualizarPropertyInputDto;
  expectedUpdatedAt: string;
} {
  const { updatedAt, ...rest } = body;
  return {
    input: {
      ...(rest.operacion !== undefined ? { operacion: rest.operacion } : {}),
      ...(rest.tipo !== undefined ? { tipo: rest.tipo } : {}),
      ...(rest.titulo
        ? {
            titulo: {
              es: rest.titulo.es,
              ...(rest.titulo.en !== undefined ? { en: rest.titulo.en } : {}),
              ...(rest.titulo.autoTranslate !== undefined
                ? { autoTranslate: rest.titulo.autoTranslate }
                : {}),
            },
          }
        : {}),
      ...(rest.descripcion !== undefined
        ? {
            descripcion: {
              es: rest.descripcion.es,
              ...(rest.descripcion.en !== undefined ? { en: rest.descripcion.en } : {}),
              ...(rest.descripcion.autoTranslate !== undefined
                ? { autoTranslate: rest.descripcion.autoTranslate }
                : {}),
            },
          }
        : {}),
      ...(rest.precio !== undefined ? { precio: rest.precio } : {}),
      ...(rest.departamento !== undefined ? { departamento: rest.departamento } : {}),
      ...(rest.municipio !== undefined ? { municipio: rest.municipio } : {}),
      ...(rest.estrato !== undefined ? { estrato: rest.estrato } : {}),
      ...(rest.predial !== undefined ? { predial: rest.predial } : {}),
      ...(rest.administracion !== undefined ? { administracion: rest.administracion } : {}),
      ...(rest.acabados !== undefined
        ? {
            acabados: {
              es: rest.acabados.es,
              ...(rest.acabados.en !== undefined ? { en: rest.acabados.en } : {}),
              ...(rest.acabados.autoTranslate !== undefined
                ? { autoTranslate: rest.acabados.autoTranslate }
                : {}),
            },
          }
        : {}),
      ...(rest.antiguedad !== undefined ? { antiguedad: rest.antiguedad } : {}),
      ...(rest.areaConstruida !== undefined ? { areaConstruida: rest.areaConstruida } : {}),
      ...(rest.areaLote !== undefined ? { areaLote: rest.areaLote } : {}),
      ...(rest.dormitorios !== undefined ? { dormitorios: rest.dormitorios } : {}),
      ...(rest.banos !== undefined ? { banos: rest.banos } : {}),
      ...(rest.parqueaderos !== undefined ? { parqueaderos: rest.parqueaderos } : {}),
      ...(rest.deposito !== undefined ? { deposito: rest.deposito } : {}),
      ...(rest.amenidades !== undefined ? { amenidades: rest.amenidades } : {}),
      ...(rest.puntosInteres !== undefined
        ? {
            puntosInteres: rest.puntosInteres.map((pi) =>
              pi.categoria !== undefined
                ? { categoria: pi.categoria, etiqueta: pi.etiqueta }
                : { etiqueta: pi.etiqueta },
            ),
          }
        : {}),
      ...(rest.fotos !== undefined ? { fotos: rest.fotos } : {}),
      ...(rest.videos !== undefined ? { videos: rest.videos } : {}),
      ...(rest.panoramas !== undefined ? { panoramas: rest.panoramas } : {}),
      ...(rest.destacada !== undefined ? { destacada: rest.destacada } : {}),
      ...(rest.proyecto !== undefined
        ? {
            proyecto: {
              ...(rest.proyecto.etapa !== undefined
                ? {
                    etapa: {
                      es: rest.proyecto.etapa.es,
                      ...(rest.proyecto.etapa.en !== undefined
                        ? { en: rest.proyecto.etapa.en }
                        : {}),
                      ...(rest.proyecto.etapa.autoTranslate !== undefined
                        ? { autoTranslate: rest.proyecto.etapa.autoTranslate }
                        : {}),
                    },
                  }
                : {}),
              ...(rest.proyecto.fechaEntregaEstimada !== undefined
                ? { fechaEntregaEstimada: rest.proyecto.fechaEntregaEstimada }
                : {}),
              ...(rest.proyecto.unidadesDisponibles !== undefined
                ? { unidadesDisponibles: rest.proyecto.unidadesDisponibles }
                : {}),
            },
          }
        : {}),
    },
    expectedUpdatedAt: updatedAt,
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

      const { input, expectedUpdatedAt } = buildUpdatePropertyInput(body);

      const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : undefined;
      const command: ActualizarPropertyCommand = {
        idOrSlug: params.idOrSlug,
        input,
        expectedUpdatedAt,
        requestId,
      };
      const resultado = await useCase.execute(command);

      writeSuccess(res, resultado.property, MSG_PROPERTY_UPDATED);
    } catch (error) {
      next(error);
    }
  };
