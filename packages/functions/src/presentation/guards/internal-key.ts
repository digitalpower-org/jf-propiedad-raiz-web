import type { RequestHandler } from 'express';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';
import type { ApiDeps } from '../appBuilder';

export function internalKeyGuard(deps: ApiDeps): RequestHandler {
  return (req, _res, next) => {
    const provided = req.header('x-internal-key') ?? '';

    if (!deps.secretComparator.equals(provided, deps.internalKey)) {
      next(new ApiError(errorCode.unauthorized, 'Clave interna inválida'));
      return;
    }

    next();
  };
}
