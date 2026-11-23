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

    expect(useCase.execute).toHaveBeenCalledWith({
      operacion: 'VENTA',
      destacada: false,
      includeHidden: false,
    });
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
      includeHidden: false,
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
      includeHidden: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).not.toHaveBeenCalled();
  });

  describe('validación de presets (8 combinaciones válidas)', () => {
    const baseQuery = { operacion: 'VENTA', destacada: 'false' };

    it('acepta preset 1 (solo base: operacion + destacada)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq(baseQuery);

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+2 (base + rangoPrecio)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({ ...baseQuery, precioMin: 100000000, precioMax: 200000000 });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+3 (base + tipo)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({ ...baseQuery, tipo: 'CASA' });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+4 (base + ubicacion)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({ ...baseQuery, departamento: 'Antioquia', municipio: 'Medellín' });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+2+3 (base + rangoPrecio + tipo)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        ...baseQuery,
        precioMin: 100000000,
        precioMax: 200000000,
        tipo: 'CASA',
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+2+4 (base + rangoPrecio + ubicacion)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        ...baseQuery,
        precioMin: 100000000,
        precioMax: 200000000,
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+3+4 (base + tipo + ubicacion)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        ...baseQuery,
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('acepta preset 1+2+3+4 (base + rangoPrecio + tipo + ubicacion)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: undefined,
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        ...baseQuery,
        precioMin: 100000000,
        precioMax: 200000000,
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });

    it('rechaza combinación inválida: solo tipo sin base (imposible por schema, pero validamos preset)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      // Esta combinación no debería pasar el schema base (operacion y destacada son requeridos)
      // Pero probamos que el preset validation rechaza combinaciones no documentadas
      const req = makeReq({
        operacion: 'VENTA',
        destacada: 'false',
        tipo: 'CASA',
        precioMin: 100000000, // precioMin sin precioMax -> no es rangoPrecio válido
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rechaza combinación inválida: precioMin sin precioMax (no forma preset válido)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        operacion: 'VENTA',
        destacada: 'false',
        precioMin: 100000000,
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rechaza combinación inválida: precioMax sin precioMin (no forma preset válido)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        operacion: 'VENTA',
        destacada: 'false',
        precioMax: 200000000,
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('acepta cursor, limit e includeHidden sin afectar preset (excluidos de membresía)', async () => {
      const useCase = { execute: vi.fn() } as unknown as ListarPropertiesUseCase;
      (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [],
        nextCursor: 'cursor-123',
      });
      const handler = makeListPropertiesHandler(useCase);
      const res = makeRes();
      const req = makeReq({
        operacion: 'VENTA',
        destacada: 'false',
        tipo: 'CASA',
        cursor: 'abc123',
        limit: '10',
        includeHidden: 'false',
      });

      await (handler as AsyncHandler)(req, res, next);

      expect(useCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          operacion: 'VENTA',
          destacada: false,
          tipo: 'CASA',
          cursor: 'abc123',
          limit: 10,
          includeHidden: false,
        }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
