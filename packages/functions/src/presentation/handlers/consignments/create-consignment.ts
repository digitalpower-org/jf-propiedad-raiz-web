import { z } from 'zod';

import type { CrearConsignmentUseCase } from '../../../application/use-cases/consignments/crear-consignment';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';
import { writeSuccess } from '../../protocol';
import { ApiError } from '../../../domain/errors/api-error';
import { errorCode } from '../../../domain/errors/errorCatalog';

const bodySchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  telefono: z.string().min(1, 'El teléfono es obligatorio'),
  email: z.string().email('Email inválido'),
  tipo: z.enum([
    'CASA',
    'APARTAMENTO',
    'LOTE_CAMPESTRE',
    'LOTE_URBANO',
    'FINCA',
    'LOCAL_COMERCIAL',
    'BODEGA',
    'OFICINA',
  ]),
  departamento: z.string().min(1, 'El departamento es obligatorio'),
  municipio: z.string().min(1, 'El municipio es obligatorio'),
  valor: z.number().int().nonnegative().optional(),
  areaConstruida: z.number().nonnegative().optional(),
  areaLote: z.number().nonnegative().optional(),
  mensaje: z.string().optional(),
  consent: z.boolean(),
  sitio: z.string().optional(),
  idioma: z.enum(['es', 'en']).optional(),
});

/**
 * POST /api/v1/consignments — Solicitud «Consigne su propiedad».
 * Ruta pública (sin sesión). Requiere `X-Client-IP` para el límite de envíos.
 */
export const makeCreateConsignmentHandler =
  (crearConsignmentUseCase: CrearConsignmentUseCase): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // safeParse por decisión de negocio: distinguir consentimiento ausente
      // (CONSENT_REQUIRED) de un cuerpo malformed (422 VALIDATION_ERROR del middleware central).
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        const [issue] = parsed.error.issues;
        const soloConsentFaltante =
          parsed.error.issues.length === 1 &&
          issue?.path[0] === 'consent' &&
          issue.code === 'invalid_type' &&
          req.body?.consent === undefined;
        if (soloConsentFaltante) {
          throw new ApiError(errorCode.consentRequired, 'Se requiere consentimiento para enviar');
        }
        throw parsed.error;
      }
      const input = parsed.data;
      if (input.consent !== true) {
        throw new ApiError(errorCode.consentRequired, 'Se requiere consentimiento para enviar');
      }
      const resultado = await crearConsignmentUseCase.execute({
        input: { ...input, consent: true },
        requestId: res.locals.requestId,
      });
      writeSuccess(res, resultado, 'Solicitud de consignación registrada');
    } catch (error) {
      next(error);
    }
  };
