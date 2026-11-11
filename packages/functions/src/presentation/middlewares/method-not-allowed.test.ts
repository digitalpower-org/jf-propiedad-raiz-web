import { describe, expect, it, vi } from 'vitest';

import { methodNotAllowed } from './method-not-allowed';
import { ApiError } from '../../domain/errors/api-error';
import type { Request, Response, NextFunction } from 'express';

describe('methodNotAllowed middleware', () => {
  it('llama next con ApiError METHOD_NOT_ALLOWED usando el método de la request', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { method: 'POST' } as unknown as Request;
    const res = {} as unknown as Response;

    methodNotAllowed(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError('METHOD_NOT_ALLOWED', 'Método POST no permitido'),
    );
  });
});
