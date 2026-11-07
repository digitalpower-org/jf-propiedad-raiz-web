import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorData } from '@jf/shared-types';

import type { Logger } from '../../application/ports/logger';
import { ApiError } from '../../domain/errors/api-error';
import { STATUS_BY_CODE } from '../errorStatus';
import { writeError } from '../protocol';

const VALIDATION_MESSAGE = 'Datos inválidos';

export function makeErrorMiddleware(logger: Logger): ErrorRequestHandler {
  return (error: unknown, _req, res, _next): void => {
    const requestId = String(res.locals.requestId ?? '');

    if (error instanceof ApiError) {
      const data: ApiErrorData =
        error.details === undefined
          ? { code: error.code, requestId }
          : { code: error.code, details: error.details, requestId };
      writeError(res, STATUS_BY_CODE[error.code], data, error.message);
      return;
    }

    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        issue: issue.message,
      }));
      writeError(
        res,
        STATUS_BY_CODE.VALIDATION_ERROR,
        { code: 'VALIDATION_ERROR', details, requestId },
        VALIDATION_MESSAGE,
      );
      return;
    }

    if (error instanceof SyntaxError) {
      writeError(
        res,
        STATUS_BY_CODE.VALIDATION_ERROR,
        { code: 'VALIDATION_ERROR', requestId },
        VALIDATION_MESSAGE,
      );
      return;
    }

    logger.error('unhandled_error', error, { requestId });
    writeError(res, STATUS_BY_CODE.INTERNAL, { code: 'INTERNAL', requestId }, 'Error interno');
  };
}
