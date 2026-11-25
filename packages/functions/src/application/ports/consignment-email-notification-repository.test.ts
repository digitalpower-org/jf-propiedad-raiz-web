// T3.4 — Tests unitarios del puerto consignment-email-notification-repository con fakes.

import { describe, expect, it, vi } from 'vitest';

import type { ConsignmentEmailNotificationRepository } from './consignment-email-notification-repository';
import type { ResendNotification } from '../consignments/resend-notification';

function notificacion(overrides: Partial<ResendNotification> = {}): ResendNotification {
  return {
    eventId: 'evt-456',
    eventType: 'email.delivered',
    createdAt: '2026-11-24T12:00:00.000Z',
    receivedAt: '2026-11-24T12:00:05.000Z',
    ...overrides,
  };
}

function entrada(svixId = 'evt-456', requestId = 'req-123') {
  return {
    svixId,
    requestId,
    notification: notificacion(),
    expiresAt: '2026-11-25T12:00:00.000Z',
  };
}

function makeFakeRepository(): ConsignmentEmailNotificationRepository {
  const store = new Map<
    string,
    { readonly requestId: string; readonly notification: ResendNotification }
  >();
  return {
    appendIfAbsent: vi.fn(async (input) => {
      if (!store.has(input.svixId)) {
        store.set(input.svixId, { requestId: input.requestId, notification: input.notification });
      }
    }),
    listByRequestId: vi.fn(async (requestId: string) => {
      return [...store.values()]
        .filter((e) => e.requestId === requestId)
        .map((e) => e.notification);
    }),
  };
}

describe('ConsignmentEmailNotificationRepository (fake)', () => {
  it('appendIfAbsent persiste y listByRequestId lo recupera por requestId', async () => {
    const repo = makeFakeRepository();
    const input = entrada();

    await repo.appendIfAbsent(input);

    const resultado = await repo.listByRequestId('req-123');
    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual(input.notification);
  });

  it('appendIfAbsent es idempotente: mismo svixId no duplica', async () => {
    const repo = makeFakeRepository();
    const input = entrada();

    await repo.appendIfAbsent(input);
    await repo.appendIfAbsent(input);

    const resultado = await repo.listByRequestId('req-123');
    expect(resultado).toHaveLength(1);
  });

  it('listByRequestId no devuelve notificaciones de otro requestId', async () => {
    const repo = makeFakeRepository();
    await repo.appendIfAbsent(entrada('evt-1', 'req-1'));
    await repo.appendIfAbsent(entrada('evt-2', 'req-2'));

    const resultado = await repo.listByRequestId('req-1');
    expect(resultado).toHaveLength(1);
    expect(resultado[0].eventId).toBe('evt-456');
  });

  it('listByRequestId devuelve array vacio cuando no hay notificaciones', async () => {
    const repo = makeFakeRepository();

    const resultado = await repo.listByRequestId('req-inexistente');

    expect(resultado).toEqual([]);
  });
});
