import { describe, expect, it, vi } from 'vitest';

import { ZodError } from 'zod';
import type { Request, Response } from 'express';

import { svixHeadersGuard } from './svix-headers';

const cabecerasValidas = {
  'svix-id': 'msg_123',
  'svix-timestamp': '1733000000',
  'svix-signature': 'v1,signature',
};

function makeReq(headers: Record<string, unknown>): Request {
  return { headers } as unknown as Request;
}

describe('svixHeadersGuard', () => {
  it('llama next() cuando las cabeceras Svix son válidas', () => {
    const next = vi.fn();
    const req = makeReq(cabecerasValidas);
    const res = {} as unknown as Response;

    svixHeadersGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('acepta cabeceras adicionales sin rechazarlas', () => {
    const next = vi.fn();
    const req = makeReq({ ...cabecerasValidas, 'content-type': 'application/json' });
    const res = {} as unknown as Response;

    svixHeadersGuard(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it.each([['svix-id'], ['svix-timestamp'], ['svix-signature']])(
    'llama next con ZodError(path %s) cuando falta esa cabecera',
    (campo) => {
      const next = vi.fn();
      const headers: Record<string, unknown> = { ...cabecerasValidas };
      delete headers[campo];
      const req = makeReq(headers);
      const res = {} as unknown as Response;

      svixHeadersGuard(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalledWith();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(ZodError);
      expect(error.issues[0].path).toEqual([campo]);
    },
  );

  it('llama next con ZodError cuando una cabecera es un arreglo', () => {
    const next = vi.fn();
    const req = makeReq({ ...cabecerasValidas, 'svix-id': ['uno', 'dos'] });
    const res = {} as unknown as Response;

    svixHeadersGuard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalledWith();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });
});
