import type { RequestHandler } from 'express';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

/**
 * Exige la cabecera `X-Client-IP` para las consignaciones.
 *
 * No hace fallback a `req.ip`: la IP debe venir explícitamente del cliente
 * para que el rate limiter y la identidad sean deterministas.
 */
export const requireClientIp: RequestHandler = (req, _res, next) => {
  const provided = req.header('x-client-ip') ?? '';
  const trimmed = provided.trim();

  if (!trimmed) {
    next(
      new ApiError(errorCode.validationError, 'Falta la cabecera X-Client-IP', [
        { field: 'x-client-ip', issue: 'La cabecera X-Client-IP es obligatoria' },
      ]),
    );
    return;
  }

  next();
};
