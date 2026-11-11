import { describe, expect, it, vi } from 'vitest';

import { healthHandler } from './health';
import type { NextFunction, Request, Response } from 'express';

describe('healthHandler', () => {
  it('responde 200 con el cuerpo de salud esperado', () => {
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const req = {} as unknown as Request;

    const next = vi.fn() as unknown as NextFunction;

    healthHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
  });
});
