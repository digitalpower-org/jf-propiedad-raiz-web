import { describe, expect, it, vi } from 'vitest';

import { requireClientIp } from './client-ip';
import { ApiError } from '../../domain/errors/api-error';
import type { Request, Response, NextFunction } from 'express';

describe('requireClientIp', () => {
  it('llama next() cuando la cabecera X-Client-IP es válida', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue('1.2.3.4') } as unknown as Request;
    const res = {} as unknown as Response;

    requireClientIp(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('llama next con ApiError VALIDATION_ERROR cuando la cabecera X-Client-IP está ausente', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = {} as unknown as Response;

    requireClientIp(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError('VALIDATION_ERROR', 'Falta la cabecera X-Client-IP', [
        { field: 'x-client-ip', issue: 'La cabecera X-Client-IP es obligatoria' },
      ]),
    );
  });

  it('llama next con ApiError VALIDATION_ERROR cuando la cabecera X-Client-IP está vacía', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue('') } as unknown as Request;
    const res = {} as unknown as Response;

    requireClientIp(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError('VALIDATION_ERROR', 'Falta la cabecera X-Client-IP', [
        { field: 'x-client-ip', issue: 'La cabecera X-Client-IP es obligatoria' },
      ]),
    );
  });

  it('llama next con ApiError VALIDATION_ERROR cuando la cabecera X-Client-IP solo contiene espacios', () => {
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue('   ') } as unknown as Request;
    const res = {} as unknown as Response;

    requireClientIp(req, res, next);

    expect(next).toHaveBeenCalledWith(
      new ApiError('VALIDATION_ERROR', 'Falta la cabecera X-Client-IP', [
        { field: 'x-client-ip', issue: 'La cabecera X-Client-IP es obligatoria' },
      ]),
    );
  });
});
