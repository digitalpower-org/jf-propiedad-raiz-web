import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ObtenerPropertyUseCase } from '../../../application/use-cases/properties/obtener-property';
import { makeObtenerPropertyHandler } from './get-property';
import type { AsyncHandler } from '../types';
import type { Request, Response, NextFunction } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: {},
  } as unknown as Response;
}

function makeReq(params: unknown, headers: Record<string, string> = {}) {
  return {
    body: {},
    params,
    query: {},
    headers,
    header: vi.fn(),
  } as unknown as Request;
}

const nextMock = vi.fn();
const next = nextMock as unknown as NextFunction;

describe('makeObtenerPropertyHandler', () => {
  beforeEach(() => {
    nextMock.mockClear();
  });
  it('responde con la propiedad ACTIVE y mensaje de éxito (sin sesión)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001', status: 'ACTIVE' },
      esPublico: true,
    });
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'doc-1' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      idOrSlug: 'doc-1',
      esPublico: true,
      includeHidden: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001', status: 'ACTIVE' },
      message: 'Inmueble obtenido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde con HIDDEN cuando hay sesión (incluye hidden)', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001', status: 'HIDDEN' },
      esPublico: true,
    });
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      { idOrSlug: 'doc-1' },
      {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
        'x-user-email': 'admin@example.com',
      },
    );

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      idOrSlug: 'doc-1',
      esPublico: true,
      includeHidden: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001', status: 'HIDDEN' },
      message: 'Inmueble obtenido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 404 si la propiedad está HIDDEN y no hay sesión', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001', status: 'HIDDEN' },
      esPublico: true,
    });
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'doc-1' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      idOrSlug: 'doc-1',
      esPublico: true,
      includeHidden: false,
    });
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responde 200 con propiedad ACTIVE cuando hay sesión', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001', status: 'ACTIVE' },
      esPublico: true,
    });
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      { idOrSlug: 'doc-1' },
      {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
        'x-user-email': 'admin@example.com',
      },
    );

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({
      idOrSlug: 'doc-1',
      esPublico: true,
      includeHidden: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001', status: 'ACTIVE' },
      message: 'Inmueble obtenido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no_encontrado'));
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      { idOrSlug: 'inexistente' },
      {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
        'x-user-email': 'admin@example.com',
      },
    );

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
