import { z } from 'zod';

import type { CrearConsignmentUseCase } from '../../../application/use-cases/consignments/crear-consignment';
import type { RateLimiter, RateLimitedError } from '../../../application/ports/rate-limiter';
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
  consent: z.boolean().optional(),
  sitio: z.string().optional(),
  idioma: z.enum(['es', 'en']).optional(),
});

/**
 * POST /api/v1/consignments — Solicitud «Consigne su propiedad».
 * Ruta pública (sin sesión). Requiere `X-Client-IP` para el límite de envíos.
 */
export const makeCreateConsignmentHandler =
  (crearConsignmentUseCase: CrearConsignmentUseCase, rateLimiter: RateLimiter): AsyncHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIp = req.headers['x-client-ip'] as string | undefined;
      if (!clientIp) {
        throw new Error('X-Client-IP header requerido');
      }

      // AC3.4.2 — Límite de envíos: máximo 5 por minuto desde la misma IP.
      try {
        await rateLimiter.check(clientIp, 5, 60);
      } catch (error) {
        if ((error as RateLimitedError).code === 'RATE_LIMITED') {
          throw new ApiError(errorCode.rateLimited, 'Límite de envíos excedido');
        }
        throw error;
      }

      bodySchema.parse(req.body);

      const resultado = await crearConsignmentUseCase.execute({
        input: req.body as Parameters<CrearConsignmentUseCase['execute']>[0]['input'],
      });

      writeSuccess(res, resultado, 'Solicitud de consignación registrada');
    } catch (error) {
      next(error);
    }
  };
