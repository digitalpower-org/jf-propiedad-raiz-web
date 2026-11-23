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
const validBody = { precio: 200000000, updatedAt: '2026-01-15T10:00:00.000Z' };
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
      execute: async (cmd: {
        idOrSlug: string;
        input: unknown;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
      expectedUpdatedAt: '2026-01-15T10:00:00.000Z',
      input: {
        precio: 200000000,
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
      requestId: undefined,
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

  it('acepta titulo con en y autoTranslate en actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
        titulo: { es: 'Casa actualizada', en: 'Updated house', autoTranslate: false },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: ActualizarPropertyInputDto }).input.titulo).toEqual({
      es: 'Casa actualizada',
      en: 'Updated house',
      autoTranslate: false,
    });
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta descripcion vacia con autoTranslate en actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
        descripcion: { es: '', autoTranslate: true },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: ActualizarPropertyInputDto }).input.descripcion).toEqual({
      es: '',
      autoTranslate: true,
    });
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza enPendiente en titulo con 422 en actualización', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      validParams,
      {
        ...validBody,
        titulo: { es: 'Casa actualizada', enPendiente: true },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza enPendiente en descripcion con 422 en actualización', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(
      validParams,
      {
        ...validBody,
        descripcion: { es: 'Descripción', enPendiente: true },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('incluye requestId en el command cuando existe en res.locals', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as ActualizarPropertyUseCase;
    const handler = makeUpdatePropertyHandler(useCase);
    const res = makeRes();
    res.locals.requestId = 'req-456';
    const req = makeReq(validParams, validBody, validHeaders);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { requestId?: string }).requestId).toBe('req-456');
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta acabados con autoTranslate en actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
        acabados: { es: 'Acabados actualizados', autoTranslate: true },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: ActualizarPropertyInputDto }).input.acabados).toEqual({
      es: 'Acabados actualizados',
      autoTranslate: true,
    });
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta puntosInteres con etiqueta traducible en actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
        puntosInteres: [
          { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
          { etiqueta: { es: 'Parque personalizado', en: 'Custom park' } },
        ],
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: ActualizarPropertyInputDto }).input.puntosInteres).toEqual([
      { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
      { etiqueta: { es: 'Parque personalizado', en: 'Custom park' } },
    ]);
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta proyecto.etapa con autoTranslate en actualización', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: {
        idOrSlug: string;
        input: ActualizarPropertyInputDto;
        expectedUpdatedAt?: string;
        requestId?: string;
      }) => {
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
        proyecto: { etapa: { es: 'En construcción', autoTranslate: true } },
      },
      validHeaders,
    );

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: ActualizarPropertyInputDto }).input.proyecto?.etapa).toEqual({
      es: 'En construcción',
      autoTranslate: true,
    });
    expect((received[0] as { expectedUpdatedAt?: string }).expectedUpdatedAt).toBe(
      '2026-01-15T10:00:00.000Z',
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });
});
