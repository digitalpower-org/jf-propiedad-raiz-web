import { describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';

import type { Request, Response } from 'express';

import type { ObtenerNotificacionesResendUseCase } from '../../../application/use-cases/consignments/obtener-notificaciones-resend';
import { makeGetEmailNotificationsHandler } from './get-email-notifications';

function makeSut(
  overrides: {
    execute?: ObtenerNotificacionesResendUseCase['execute'];
  } = {},
) {
  const executeMock =
    overrides.execute ??
    vi.fn().mockResolvedValue({
      requestId: 'req-123',
      notifications: [
        {
          eventId: 'evt-456',
          eventType: 'email.delivered',
          createdAt: '2026-11-24T12:00:00.000Z',
          receivedAt: '2026-11-24T12:00:05.000Z',
        },
      ],
    });
  const obtenerNotificaciones: ObtenerNotificacionesResendUseCase = {
    execute: executeMock,
  } as unknown as ObtenerNotificacionesResendUseCase;

  return {
    sut: makeGetEmailNotificationsHandler(obtenerNotificaciones),
    execute: executeMock,
  };
}

function makeReq(query: Record<string, string> = {}): Request {
  return { query } as unknown as Request;
}

function makeRes(): Response {
  const res = {} as unknown as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('GET /api/v1/consignments/email-notifications', () => {
  it('responde 200 con requestId y notificaciones del caso de uso', async () => {
    const { sut, execute } = makeSut();
    const req = makeReq({ requestId: 'req-123' });
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith({ requestId: 'req-123' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        requestId: 'req-123',
        notifications: [
          {
            eventId: 'evt-456',
            eventType: 'email.delivered',
            createdAt: '2026-11-24T12:00:00.000Z',
            receivedAt: '2026-11-24T12:00:05.000Z',
          },
        ],
      },
      message: '',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 200 con notifications vacía cuando el caso de uso no devuelve notificaciones', async () => {
    const { sut, execute } = makeSut({
      execute: vi.fn().mockResolvedValue({ requestId: 'req-123', notifications: [] }),
    });
    const req = makeReq({ requestId: 'req-123' });
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { requestId: 'req-123', notifications: [] },
      message: '',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rechaza query sin requestId con 422 (VALIDATION_ERROR)', async () => {
    const { sut, execute } = makeSut();
    const req = makeReq({});
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(execute).not.toHaveBeenCalled();
    expect(vi.mocked(next)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(next).mock.calls[0][0]).toBeInstanceOf(ZodError);
  });
});
