import type { RequestHandler } from 'express';

import { ApiError } from '../../domain/errors/api-error';

export const methodNotAllowed: RequestHandler = (req, _res, next) => {
  next(new ApiError('METHOD_NOT_ALLOWED', `Método ${req.method} no permitido`));
};
