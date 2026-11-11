import { describe, expect, it, vi } from 'vitest';

import { writeSuccess, writeError } from './protocol';
import type { Response } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe('writeSuccess', () => {
  it('escribe respuesta de éxito con status 200 por defecto', () => {
    const res = makeRes();
    const data = { id: 'abc-123' };

    writeSuccess(res, data, 'Operación exitosa');

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data,
      message: 'Operación exitosa',
    });
  });

  it('escribe respuesta de éxito con status personalizado', () => {
    const res = makeRes();

    writeSuccess(res, { codigo: 'JF-0001' }, 'Creado', 201);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { codigo: 'JF-0001' },
      message: 'Creado',
    });
  });
});

describe('writeError', () => {
  it('escribe respuesta de error con status y datos proporcionados', () => {
    const res = makeRes();

    writeError(res, 404, { code: 'NOT_FOUND', requestId: 'req-1' }, 'No encontrado');

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: { code: 'NOT_FOUND', requestId: 'req-1' },
      message: 'No encontrado',
    });
  });

  it('escribe respuesta de error con details', () => {
    const res = makeRes();

    writeError(
      res,
      422,
      {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'precio', issue: 'Debe ser positivo' }],
        requestId: 'req-2',
      },
      'Datos inválidos',
    );

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'precio', issue: 'Debe ser positivo' }],
        requestId: 'req-2',
      },
      message: 'Datos inválidos',
    });
  });
});
