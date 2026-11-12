import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const nextMock = vi.fn();
const next = nextMock as unknown as NextFunction;

beforeEach(() => {
  nextMock.mockClear();
});

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

  it('rechaza con ZodError cuando precioMin es mayor que precioMax (AC1.10.3)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      operacion: 'VENTA',
      destacada: 'false',
      precioMin: 200000000,
      precioMax: 100000000,
    });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError cuando departamento va sin municipio (AC1.10.5)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({ operacion: 'VENTA', destacada: 'false', departamento: 'Medellín' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza con ZodError cuando municipio va sin departamento (AC1.10.5)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({ operacion: 'VENTA', destacada: 'false', municipio: 'Envigado' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('acepta precioMin y precioMax válidos (precioMin ≤ precioMax)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      operacion: 'VENTA',
      destacada: 'false',
      precioMin: 100000000,
      precioMax: 200000000,
    });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      operacion: 'VENTA',
      destacada: false,
      precioMin: 100000000,
      precioMax: 200000000,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta departamento y municipio enviados juntos', async () => {
    const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      items: [],
      nextCursor: undefined,
    });
    const handler = makeListPropertiesHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      operacion: 'VENTA',
      destacada: 'false',
      departamento: 'Medellín',
      municipio: 'Envigado',
    });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      operacion: 'VENTA',
      destacada: false,
      departamento: 'Medellín',
      municipio: 'Envigado',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
