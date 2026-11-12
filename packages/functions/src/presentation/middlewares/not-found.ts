import type { RequestHandler } from 'express';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

export const notFoundMiddleware: RequestHandler = (_req, _res, next) => {
  next(new ApiError(errorCode.notFound, 'Recurso no encontrado'));
};
