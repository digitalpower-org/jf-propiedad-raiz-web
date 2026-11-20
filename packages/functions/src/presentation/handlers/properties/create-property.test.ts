import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CrearPropertyUseCase } from '../../../application/use-cases/properties/crear-property';
import type { CrearPropertyInputDto } from '../../../application/ports/properties-repository';
import { makeCreatePropertyHandler } from './create-property';
import type { AsyncHandler } from '../types';
import type { Request, Response } from 'express';

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

const next = vi.fn();

const validBody = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
};

describe('makeCreatePropertyHandler', () => {
  beforeEach(() => {
    next.mockClear();
  });

  it('responde 201 con la propiedad creada y mensaje de éxito', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validBody);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble creado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = {
      execute: async () => {
        throw new Error('error_creando');
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validBody);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('acepta fotos, videos y panoramas en el body de creación', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: unknown }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      fotos: [
        {
          derivados: [
            { clave: 'abc-123-320.webp', ancho: 320, alto: 240 },
            { clave: 'abc-123-640.webp', ancho: 640, alto: 480 },
          ],
        },
      ],
      videos: ['https://youtu.be/abc123'],
      panoramas: [
        {
          derivados: [{ clave: 'pqr-456-2048.webp', ancho: 2048, alto: 1024 }],
        },
      ],
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      input: {
        ...validBody,
        fotos: [
          {
            derivados: [
              { clave: 'abc-123-320.webp', ancho: 320, alto: 240 },
              { clave: 'abc-123-640.webp', ancho: 640, alto: 480 },
            ],
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
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza fotos sin derivados', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      fotos: [{ derivados: [] }],
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('acepta titulo con en y autoTranslate', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      titulo: { es: 'Casa en venta', en: 'House for sale', autoTranslate: false },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: CrearPropertyInputDto }).input.titulo).toEqual({
      es: 'Casa en venta',
      en: 'House for sale',
      autoTranslate: false,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta descripcion vacia con autoTranslate', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      descripcion: { es: '', autoTranslate: true },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: CrearPropertyInputDto }).input.descripcion).toEqual({
      es: '',
      autoTranslate: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza enPendiente en titulo con 422', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      titulo: { es: 'Casa en venta', enPendiente: true },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rechaza enPendiente en descripcion con 422', async () => {
    const useCase = {
      execute: async () => ({ property: { codigo: 'JF-0001' } }),
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      descripcion: { es: 'Descripción', enPendiente: true },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('incluye requestId en el command cuando existe en res.locals', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto; requestId?: string }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    res.locals.requestId = 'req-123';
    const req = makeReq(validBody);

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { requestId?: string }).requestId).toBe('req-123');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta acabados con autoTranslate', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      acabados: { es: 'Acabados de lujo', autoTranslate: true },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: CrearPropertyInputDto }).input.acabados).toEqual({
      es: 'Acabados de lujo',
      autoTranslate: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta puntosInteres con etiqueta traducible', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      puntosInteres: [
        { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
        { etiqueta: { es: 'Parque personalizado', en: 'Custom park' } },
      ],
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: CrearPropertyInputDto }).input.puntosInteres).toEqual([
      { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
      { etiqueta: { es: 'Parque personalizado', en: 'Custom park' } },
    ]);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });

  it('acepta proyecto.etapa con autoTranslate', async () => {
    const received: unknown[] = [];
    const useCase = {
      execute: async (cmd: { input: CrearPropertyInputDto }) => {
        received.push(cmd);
        return { property: { codigo: 'JF-0001' } };
      },
    } as unknown as CrearPropertyUseCase;
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq({
      ...validBody,
      proyecto: { etapa: { es: 'En construcción', autoTranslate: true } },
    });

    await (handler as AsyncHandler)(req, res, next as unknown as Parameters<AsyncHandler>[2]);

    expect(received).toHaveLength(1);
    expect((received[0] as { input: CrearPropertyInputDto }).input.proyecto?.etapa).toEqual({
      es: 'En construcción',
      autoTranslate: true,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(next).not.toHaveBeenCalled();
  });
});
