import { describe, expect, it, vi } from 'vitest';

import { requestId } from './request-id';
import type { Request, Response, NextFunction } from 'express';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('requestId middleware', () => {
  it('usa el x-request-id entrante cuando es válido', () => {
    const req = { header: vi.fn().mockReturnValue('id-valido_123') } as unknown as Request;
    const res = {
      locals: {},
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(res.locals.requestId).toBe('id-valido_123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'id-valido_123');
    expect(next).toHaveBeenCalled();
  });

  it('genera un UUID cuando el header no cumple el patrón', () => {
    const req = { header: vi.fn().mockReturnValue('id con espacios!!') } as unknown as Request;
    const res = {
      locals: {},
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(res.locals.requestId).toMatch(UUID_PATTERN);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', res.locals.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('genera un UUID cuando el header no existe', () => {
    const req = { header: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = {
      locals: {},
      setHeader: vi.fn(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    requestId(req, res, next);

    expect(res.locals.requestId).toMatch(UUID_PATTERN);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', res.locals.requestId);
    expect(next).toHaveBeenCalled();
  });
});
