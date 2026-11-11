import { describe, expect, it, vi } from 'vitest';

import { ZodError } from 'zod';
import { ApiError } from '../../domain/errors/api-error';
import type { Logger } from '../../application/ports/logger';
import { makeErrorMiddleware } from './error';
import type { NextFunction, Request, Response } from 'express';

function makeRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    locals: { requestId: 'req-123' },
  } as unknown as Response;
}

const next = vi.fn() as unknown as NextFunction;

describe('makeErrorMiddleware', () => {
  it('mapea ApiError a su estado HTTP y escribe sobre de error', () => {
    const logger = { error: vi.fn() } as unknown as Logger;
    const middleware = makeErrorMiddleware(logger);
    const res = makeRes();

    middleware(
      new ApiError('NOT_FOUND', 'Recurso no encontrado'),
      {} as unknown as Request,
      res,
      next,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: { code: 'NOT_FOUND', details: undefined, requestId: 'req-123' },
      message: 'Recurso no encontrado',
    });
    expect(next).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('mapea ZodError a VALIDATION_ERROR con detalles de campos', () => {
    const logger = { error: vi.fn() } as unknown as Logger;
    const middleware = makeErrorMiddleware(logger);
    const res = makeRes();

    const issue: {
      code: 'invalid_type';
      expected: string;
      received: unknown;
      path: (string | number)[];
      message: string;
    } = {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['titulo', 'es'],
      message: 'Requerido',
    };
    const zodError = new ZodError([issue]);
    middleware(zodError, {} as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: {
        code: 'VALIDATION_ERROR',
        details: [{ field: 'titulo.es', issue: 'Requerido' }],
        requestId: 'req-123',
      },
      message: 'Datos inválidos',
    });
  });

  it('mapea SyntaxError a VALIDATION_ERROR sin detalles', () => {
    const logger = { error: vi.fn() } as unknown as Logger;
    const middleware = makeErrorMiddleware(logger);
    const res = makeRes();

    middleware(new SyntaxError('Unexpected token'), {} as unknown as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: { code: 'VALIDATION_ERROR', requestId: 'req-123' },
      message: 'Datos inválidos',
    });
  });

  it('registra y responde 500 para errores no controlados', () => {
    const logger = { error: vi.fn() } as unknown as Logger;
    const middleware = makeErrorMiddleware(logger);
    const res = makeRes();

    middleware(new Error('algo salio mal'), {} as unknown as Request, res, next);

    expect(logger.error).toHaveBeenCalledWith('unhandled_error', expect.any(Error), {
      requestId: 'req-123',
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      data: { code: 'INTERNAL', requestId: 'req-123' },
      message: 'Error interno',
    });
  });
});
