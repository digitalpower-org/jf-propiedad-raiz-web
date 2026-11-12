import { describe, expect, it, vi } from 'vitest';

import type { ActivarPropertyUseCase } from '../../../application/use-cases/properties/activar-property';
import { makeActivatePropertyHandler } from './activate-property';
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

describe('makeActivatePropertyHandler', () => {
  it('responde 200 con la propiedad activada y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as ActivarPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      property: { codigo: 'JF-0001' },
      primeraActivacion: true,
      fechaPublicacion: '2026-01-15T10:00:00.000Z',
    });
    const handler = makeActivatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'doc-1' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ idOrSlug: 'doc-1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble activado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ActivarPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_activando'));
    const handler = makeActivatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({ idOrSlug: 'doc-1' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
