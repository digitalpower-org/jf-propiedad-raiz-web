import { describe, expect, it, vi } from 'vitest';

import type { CrearPropertyUseCase } from '../../../application/use-cases/properties/crear-property';
import type { CrearPropertyInputDto } from '../../../application/ports/properties-repository';
import { makeCreatePropertyHandler } from './create-property';
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

const validBody: CrearPropertyInputDto = {
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: 'Casa en venta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
};

describe('makeCreatePropertyHandler', () => {
  it('responde 201 con la propiedad creada y mensaje de éxito', async () => {
    const useCase = { execute: vi.fn() } as unknown as CrearPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockResolvedValue({ property: { codigo: 'JF-0001' } });
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validBody);

    await (handler as AsyncHandler)(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ input: validBody });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Inmueble creado',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('pasa el error a next cuando el use case falla', async () => {
    const useCase = { execute: vi.fn() } as unknown as CrearPropertyUseCase;
    (useCase.execute as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('error_creando'));
    const handler = makeCreatePropertyHandler(useCase);
    const res = makeRes();
    const req = makeReq(validBody);

    await (handler as AsyncHandler)(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
