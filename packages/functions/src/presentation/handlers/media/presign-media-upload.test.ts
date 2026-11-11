import { describe, expect, it, vi } from 'vitest';

import type { PresignMediaUploadUseCase } from '../../../application/use-cases/media/presign-media-upload';
import { makePresignMediaUploadHandler } from './presign-media-upload';
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

describe('makePresignMediaUploadHandler', () => {
  it('responde con la URL presignada y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as PresignMediaUploadUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: 'https://bucket/pending/abc.jpg',
      key: 'pending/abc.jpg',
      expiresInSeconds: 900,
    });
    const handler = makePresignMediaUploadHandler(useCase);
    const res = makeRes();
    const req = makeReq({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        url: 'https://bucket/pending/abc.jpg',
        key: 'pending/abc.jpg',
        expiresInSeconds: 900,
      },
      message: 'URL presignada generada',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as PresignMediaUploadUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_presignando'));
    const handler = makePresignMediaUploadHandler(useCase);
    const res = makeRes();
    const req = makeReq({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
