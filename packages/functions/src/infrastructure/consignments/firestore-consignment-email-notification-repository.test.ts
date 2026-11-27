// Tests unitarios del repositorio Firestore de notificaciones de email de consignación (T8).

import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestoreConsignmentEmailNotificationRepository } from './firestore-consignment-email-notification-repository';
import type { ResendNotification } from '../../application/consignments/resend-notification';

interface MockFirestore {
  readonly _docs: Map<string, Record<string, unknown>>;
  readonly collection: ReturnType<typeof vi.fn>;
}

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
    notification: notificacion({ eventId: svixId }),
    expiresAt: '2026-12-25T12:00:00.000Z',
  };
}

function makeMockFirestore(): MockFirestore {
  const docs = new Map<string, Record<string, unknown>>();
  const collectionName = 'consignment_email_notifications';

  const createDocRef = (path: string) => ({
    path,
    create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      if (docs.has(path)) {
        const error: unknown = new Error('Document already exists');
        (error as { code?: string }).code = 'already-exists';
        throw error;
      }
      docs.set(path, { ...data });
    }),
  });

  const collectionRef = {
    doc: vi
      .fn()
      .mockImplementation((documentId: string) => createDocRef(`${collectionName}/${documentId}`)),
    where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => {
      const results = Array.from(docs.entries()).filter(
        ([_path, data]) => data.requestId === value,
      );
      return {
        get: vi.fn().mockImplementation(async () => ({
          docs: results.map(([path, data]) => ({
            id: path.split('/').pop()!,
            data: () => data,
          })),
        })),
      };
    }),
  };

  return {
    collection: vi.fn().mockReturnValue(collectionRef),
    _docs: docs,
  };
}

describe('createFirestoreConsignmentEmailNotificationRepository', () => {
  it('appendIfAbsent crea el documento con los campos esperados y sin PII', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);
    const input = entrada();

    await repo.appendIfAbsent(input);

    expect(db.collection).toHaveBeenCalledWith('consignment_email_notifications');
    const creado = db._docs.get(`consignment_email_notifications/${input.svixId}`);
    expect(creado).toMatchObject({
      eventId: input.notification.eventId,
      eventType: input.notification.eventType,
      requestId: input.requestId,
      consignmentKind: 'admin',
      createdAt: input.notification.createdAt,
      receivedAt: input.notification.receivedAt,
      expiresAt: input.expiresAt,
    });
    // Sin PII: no hay nombre, telefono, email, mensaje, asunto, direccion ni payload crudo.
    expect(creado).not.toHaveProperty('email');
    expect(creado).not.toHaveProperty('message_id');
    expect(creado).not.toHaveProperty('payload');
  });

  it('appendIfAbsent es idempotente: mismo svixId no duplica (no-op)', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);
    const input = entrada();

    await repo.appendIfAbsent(input);
    await repo.appendIfAbsent(input);

    const docsParaRequestId = await repo.listByRequestId(input.requestId);
    expect(docsParaRequestId).toHaveLength(1);
    expect(db._docs.size).toBe(1);
  });

  it('appendIfAbsent trata el código gRPC 6 (ALREADY_EXISTS) como duplicado: replay no duplica ni falla', async () => {
    const docs = new Map<string, Record<string, unknown>>();
    const collectionName = 'consignment_email_notifications';

    const createDocRef = (path: string) => ({
      path,
      create: vi.fn().mockImplementation(async (_data: Record<string, unknown>) => {
        if (docs.has(path)) {
          const error: unknown = new Error('Document already exists');
          (error as { code?: number }).code = 6;
          throw error;
        }
        docs.set(path, { ..._data });
      }),
    });

    const collectionRef = {
      doc: vi
        .fn()
        .mockImplementation((documentId: string) =>
          createDocRef(`${collectionName}/${documentId}`),
        ),
      where: vi.fn().mockImplementation((_field: string, _op: string, value: unknown) => {
        const results = Array.from(docs.entries()).filter(
          ([_path, data]) => data.requestId === value,
        );
        return {
          get: vi.fn().mockImplementation(async () => ({
            docs: results.map(([path, data]) => ({
              id: path.split('/').pop()!,
              data: () => data,
            })),
          })),
        };
      }),
    };

    const db: MockFirestore = {
      collection: vi.fn().mockReturnValue(collectionRef),
      _docs: docs,
    };
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);
    const input = entrada();

    await repo.appendIfAbsent(input);
    await repo.appendIfAbsent(input); // replay del webhook: código 6 → no-op idempotente

    const docsParaRequestId = await repo.listByRequestId(input.requestId);
    expect(docsParaRequestId).toHaveLength(1);
    expect(db._docs.size).toBe(1);
  });

  it('listByRequestId devuelve notificaciones del requestId dado', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);

    await repo.appendIfAbsent(entrada('evt-1', 'req-1'));
    await repo.appendIfAbsent(entrada('evt-2', 'req-1'));
    await repo.appendIfAbsent(entrada('evt-3', 'req-2'));

    const resultado = await repo.listByRequestId('req-1');

    expect(resultado).toHaveLength(2);
    expect(resultado.map((n) => n.eventId)).toEqual(['evt-1', 'evt-2']);
  });

  it('listByRequestId excluye notificaciones expiradas (expiresAt <= now)', async () => {
    const ahora = new Date('2026-11-25T12:00:00.000Z');
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore, {
      now: () => ahora,
    });

    await repo.appendIfAbsent(entrada('evt-vigente', 'req-1'));
    await repo.appendIfAbsent({
      ...entrada('evt-expirado', 'req-1'),
      expiresAt: '2026-11-24T12:00:00.000Z',
    });

    const resultado = await repo.listByRequestId('req-1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].eventId).toBe('evt-vigente');
  });

  it('listByRequestId ordena por receivedAt en memoria', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);

    await repo.appendIfAbsent({
      ...entrada('evt-tarde', 'req-1'),
      notification: {
        ...notificacion({ receivedAt: '2026-11-24T12:00:10.000Z' }),
        eventId: 'evt-tarde',
      },
    });
    await repo.appendIfAbsent({
      ...entrada('evt-temprano', 'req-1'),
      notification: {
        ...notificacion({ receivedAt: '2026-11-24T12:00:01.000Z' }),
        eventId: 'evt-temprano',
      },
    });
    await repo.appendIfAbsent({
      ...entrada('evt-medio', 'req-1'),
      notification: {
        ...notificacion({ receivedAt: '2026-11-24T12:00:05.000Z' }),
        eventId: 'evt-medio',
      },
    });

    const resultado = await repo.listByRequestId('req-1');

    expect(resultado).toHaveLength(3);
    expect(resultado.map((n) => n.eventId)).toEqual(['evt-temprano', 'evt-medio', 'evt-tarde']);
  });

  it('listByRequestId devuelve array vacio cuando no hay notificaciones', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);

    const resultado = await repo.listByRequestId('req-inexistente');

    expect(resultado).toEqual([]);
  });

  it('listByRequestId no devuelve notificaciones de otro requestId', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreConsignmentEmailNotificationRepository(db as unknown as Firestore);

    await repo.appendIfAbsent(entrada('evt-1', 'req-1'));
    await repo.appendIfAbsent(entrada('evt-2', 'req-2'));

    const resultado = await repo.listByRequestId('req-1');

    expect(resultado).toHaveLength(1);
    expect(resultado[0].eventId).toBe('evt-1');
  });
});
