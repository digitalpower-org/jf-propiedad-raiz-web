import { describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

import type { DeliveryWebhookVerifier } from '../../../application/ports/delivery-webhook-verifier';
import type { RegistrarNotificacionResendUseCase } from '../../../application/use-cases/consignments/registrar-notificacion-resend';
import { makeResendDeliveryWebhookHandler } from './resend-delivery-webhook';

function makeSut(
  overrides: {
    verifier?: Partial<DeliveryWebhookVerifier>;
    registrarNotificacion?: RegistrarNotificacionResendUseCase;
  } = {},
) {
  const verifier: DeliveryWebhookVerifier = {
    verify: vi.fn().mockResolvedValue({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: {
        consignmentRequestId: 'req-123',
        consignmentKind: 'admin',
      },
    }),
    ...overrides.verifier,
  };
  const registrarNotificacion: RegistrarNotificacionResendUseCase =
    overrides.registrarNotificacion ??
    ({
      execute: vi.fn().mockResolvedValue({ persistida: true }),
    } as unknown as RegistrarNotificacionResendUseCase);

  return {
    sut: makeResendDeliveryWebhookHandler(verifier, registrarNotificacion),
    verifier,
    registrarNotificacion,
  };
}

function makeReq(rawBody?: Buffer, headers: Record<string, string> = {}): Request {
  return {
    rawBody,
    headers,
    url: '/api/v1/webhooks/resend-delivery',
  } as unknown as Request;
}

function makeRes(): Response {
  const res = {} as unknown as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn();
  res.end = vi.fn();
  return res;
}

describe('POST /api/v1/webhooks/resend-delivery', () => {
  it('responde 200 con envelope ApiSuccess y persiste cuando el evento es de admin', async () => {
    const { sut, verifier, registrarNotificacion } = makeSut();
    const req = makeReq(Buffer.from('{}'));
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(verifier.verify).toHaveBeenCalledTimes(1);
    expect(registrarNotificacion.execute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {},
      message: expect.any(String),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 401 y no alcanza el caso de uso cuando la firma es inválida', async () => {
    const { sut, verifier, registrarNotificacion } = makeSut({
      verifier: { verify: vi.fn().mockRejectedValue(new Error('Invalid signature')) },
    });
    const req = makeReq(Buffer.from('{}'));
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(verifier.verify).toHaveBeenCalledTimes(1);
    expect(registrarNotificacion.execute).not.toHaveBeenCalled();
    expect(vi.mocked(next)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(next).mock.calls[0][0]).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('responde 401 cuando no hay body crudo', async () => {
    const { sut, registrarNotificacion } = makeSut();
    const req = makeReq(undefined);
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(registrarNotificacion.execute).not.toHaveBeenCalled();
    expect(vi.mocked(next)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(next).mock.calls[0][0]).toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('llama al caso de uso con los campos del evento verificado', async () => {
    const { sut, registrarNotificacion } = makeSut();
    const req = makeReq(Buffer.from('{}'));
    const res = makeRes();
    const next = vi.fn();

    await sut(req, res, next);

    expect(registrarNotificacion.execute).toHaveBeenCalledWith({
      eventId: 'evt-456',
      eventType: 'email.delivered',
      createdAt: '2026-11-24T12:00:00Z',
      tags: { consignmentRequestId: 'req-123', consignmentKind: 'admin' },
    });
  });
});
