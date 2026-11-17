import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActualizarPropertyUseCase } from '../../../application/use-cases/properties/actualizar-property';
import type { ActualizarPropertyInputDto } from '../../../application/ports/properties-repository';
import { makeUpdatePropertyHandler } from './update-property';
import type { AsyncHandler } from '../types';
import type { Request, Response } from 'express';

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

const next = vi.fn();

const validParams = { idOrSlug: 'doc-1' };
const validBody: ActualizarPropertyInputDto = { precio: 200000000 };
const validHeaders = {
  'x-user-id': 'user-1',
  'x-user-role': 'admin',
  'x-user-email': 'admin@example.com',
};

describe('makeUpdatePropertyHandler', () => {
  beforeEach(() => {
    next.mockClear();
  });

  it('responde 200 con la propiedad actualizada y mensaje de éxito', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validParams, validBody, validHeaders);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble actualizado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = {
      execute: async () => {
        throw new Error('error_actualizando');
      },
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validParams, validBody, validHeaders);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('acepta fotos, videos y panoramas en el body de actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { idOrSlug: string; input: unknown }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      validParams,
      {
        ...validBody,
        fotos: [
          {
            derivados: [{ clave: 'abc-123-320.webp', ancho: 320, alto: 240 }],
          },
        ],
        videos: ['https://youtu.be/abc123'],
        panoramas: [
          {
            derivados: [{ clave: 'pqr-456-2048.webp', ancho: 2048, alto: 1024 }],
          },
        ],
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      idOrSlug: 'doc-1',
      input: {
        ...validBody,
        fotos: [
          {
            derivados: [{ clave: 'abc-123-320.webp', ancho: 320, alto: 240 }],
          },
        ],
        videos: ['https://youtu.be/abc123'],
        panoramas: [
          {
            derivados: [{ clave: 'pqr-456-2048.webp', ancho: 2048, alto: 1024 }],
          },
        ],
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza fotos sin derivados en actualización', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      validParams,
      {
        ...validBody,
        fotos: [{ derivados: [] }],
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
