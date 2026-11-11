import { describe, expect, it, vi } from 'vitest';

import type { ListarPropertiesUseCase } from '../../../application/use-cases/properties/listar-properties';
import { makeListPropertiesHandler } from './list-properties';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: {},
  } as unknown as Response;
}

function makeReq(query: unknown) {
  return {
    body: {},
    params: {},
    query,
    headers: {},
    header: vi.fn(),
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

describe('makeListPropertiesHandler', () => {
  it('responde con el listado paginado y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({ operacion: 'VENTA', destacada: 'false' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ operacion: 'VENTA', destacada: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { items: [], nextCursor: undefined },
      message: 'Listado de inmuebles',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_listando'));
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({ operacion: 'VENTA', destacada: 'false' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
