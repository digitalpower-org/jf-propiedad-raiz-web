import { describe, expect, it, vi } from 'vitest';

import type { RateLimiter } from '../../../application/ports/rate-limiter';
import type { VerifyInternalSessionUseCase } from '../../../application/use-cases/auth/verify-internal-session';
import type { VerifiedIdentity } from '../../../application/use-cases/auth/verify-internal-session';
import { makeVerifyInternalSessionHandler } from './verify-internal-session';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: {},
  } as unknown as Response;
}

function makeReq(body: unknown) {
  return {
    body,
    params: {},
    query: {},
    headers: {},
    header: vi.fn(),
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

const identity: VerifiedIdentity = {
  uid: 'uid-123',
  email: 'admin@example.com',
  role: 'admin',
};

const rateLimiter: RateLimiter = { check: vi.fn().mockResolvedValue(undefined) };

describe('makeVerifyInternalSessionHandler', () => {
  it('responde con la identidad verificada y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as VerifyInternalSessionUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue(identity);
    const handler = makeVerifyInternalSessionHandler(useCase, rateLimiter);
    const res = makeRes();
    const req = makeReq({ idToken: 'token-123' });

    await (handler as AsyncHandler)(req, res, next);

    expect(rateLimiter.check).toHaveBeenCalled();
    expect(useCase.execute).toHaveBeenCalledWith({ idToken: 'token-123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: identity,
      message: 'Identidad verificada',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as VerifyInternalSessionUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('token_invalido'));
    const handler = makeVerifyInternalSessionHandler(useCase, rateLimiter);
    const res = makeRes();
    const req = makeReq({ idToken: 'token-123' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
