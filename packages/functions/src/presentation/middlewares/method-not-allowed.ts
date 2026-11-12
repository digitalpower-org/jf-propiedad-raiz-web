import type { RequestHandler } from 'express';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

export const methodNotAllowed: RequestHandler = (req, _res, next) => {
  next(new ApiError(errorCode.methodNotAllowed, `Método ${req.method} no permitido`));
};
