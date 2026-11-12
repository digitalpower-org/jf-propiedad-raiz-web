import { describe, expect, it, vi } from 'vitest';

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

function makeReq(params: unknown) {
  return {
    body: {},
    params,
    query: {},
    headers: {},
    header: vi.fn(),
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

describe('makeObtenerPropertyHandler', () => {
  it('responde con la propiedad obtenida y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001' },
      esPublico: true,
    });
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'doc-1' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ idOrSlug: 'doc-1', esPublico: true });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble obtenido',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ObtenerPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no_encontrado'));
    const handler = makeObtenerPropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'inexistente' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
