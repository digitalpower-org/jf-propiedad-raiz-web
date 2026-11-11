import { describe, expect, it, vi } from 'vitest';

import { internalKeyGuard } from './internal-key';
import { ApiError } from '../../domain/errors/api-error';
import type { ApiDeps } from '../appBuilder';
import type { Request, Response, NextFunction } from 'express';

describe('internalKeyGuard', () => {
  it('llama next() cuando la clave interna es válida', () => {
    const deps: ApiDeps = {
      internalKey: 'clave-secreta',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      secretComparator: { equals: vi.fn().mockReturnValue(true) },
    };
    const guard = internalKeyGuard(deps);
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue('clave-secreta') } as unknown as Request;
    const res = {} as unknown as Response;

    guard(req, res, next);

    expect(deps.secretComparator.equals).toHaveBeenCalledWith('clave-secreta', 'clave-secreta');
    expect(next).toHaveBeenCalledWith();
  });

  it('llama next con ApiError UNAUTHORIZED cuando la clave es inválida', () => {
    const deps: ApiDeps = {
      internalKey: 'clave-secreta',
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      secretComparator: { equals: vi.fn().mockReturnValue(false) },
    };
    const guard = internalKeyGuard(deps);
    const next = vi.fn() as unknown as NextFunction;
    const req = { header: vi.fn().mockReturnValue('clave-mala') } as unknown as Request;
    const res = {} as unknown as Response;

    guard(req, res, next);

    expect(deps.secretComparator.equals).toHaveBeenCalledWith('clave-mala', 'clave-secreta');
    expect(next).toHaveBeenCalledWith(new ApiError('UNAUTHORIZED', 'Clave interna inválida'));
  });
});
