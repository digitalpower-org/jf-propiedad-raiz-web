import { describe, expect, it, vi } from 'vitest';

import type { ActualizarPropertyUseCase } from '../../../application/use-cases/properties/actualizar-property';
import type { ActualizarPropertyInputDto } from '../../../application/ports/properties-repository';
import { makeUpdatePropertyHandler } from './update-property';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: {},
  } as unknown as Response;
}

function makeReq(params: unknown, body: unknown, headers: unknown) {
  return {
    body,
    params,
    query: {},
    headers,
    header: vi.fn(),
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

const validParams = { idOrSlug: 'doc-1' };
const validBody: ActualizarPropertyInputDto = { precio: 200000000 };
const validHeaders = {
  'x-user-id': 'user-1',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

describe('makeUpdatePropertyHandler', () => {
  it('responde 200 con la propiedad actualizada y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as ActualizarPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({ property: { codigo: 'JF-0001' } });
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validParams, validBody, validHeaders);

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ idOrSlug: 'doc-1', input: validBody });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble actualizado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ActualizarPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_actualizando'));
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validParams, validBody, validHeaders);

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
