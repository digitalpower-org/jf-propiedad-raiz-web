import { describe, expect, it, vi } from 'vitest';

import type { ConfirmarMediaUploadUseCase } from '../../../application/use-cases/media/confirmar-media-upload';
import { makeConfirmarMediaUploadHandler } from './confirm-media-upload';
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

describe('makeConfirmarMediaUploadHandler', () => {
  it('responde con los derivados y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as ConfirmarMediaUploadUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      derivados: [{ clave: 'abc-320.webp', ancho: 320 }],
    });
    const handler = makeConfirmarMediaUploadHandler(useCase);
    const res = makeRes();
    const req = makeReq({ key: 'pending/abc-123.jpg', recurso: 'foto' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ key: 'pending/abc-123.jpg', recurso: 'foto' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { derivados: [{ clave: 'abc-320.webp', ancho: 320 }] },
      message: 'Subida confirmada y derivados generados',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as ConfirmarMediaUploadUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_confirmando'));
    const handler = makeConfirmarMediaUploadHandler(useCase);
    const res = makeRes();
    const req = makeReq({ key: 'pending/abc-123.jpg', recurso: 'foto' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
