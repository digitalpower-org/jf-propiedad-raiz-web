import { describe, expect, it, vi } from 'vitest';

import { notFoundMiddleware } from './not-found';
import { ApiError, errorCode } from '../../domain/errors/api-error';
import type { Request, Response, NextFunction } from 'express';

describe('notFoundMiddleware', () => {
  it('llama next con ApiError NOT_FOUND', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = {} as unknown as Request;
    const res = {} as unknown as Response;

    notFoundMiddleware(req, res, next);

    expect(next).toHaveBeenCalledWith(new ApiError(errorCode.notFound, 'Recurso no encontrado'));
  });
});
