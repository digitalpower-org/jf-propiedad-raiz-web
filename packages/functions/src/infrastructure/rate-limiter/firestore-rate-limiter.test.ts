import { createHash } from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp, type Firestore } from 'firebase-admin/firestore';

import { createFirestoreRateLimiter } from './firestore-rate-limiter';
import { RateLimitedError } from '../../application/ports/rate-limiter';

interface FakeSnapshot {
  exists: boolean;
  id: string;
  data: () => unknown;
}

interface FakeRef {
  path: string;
  get: () => Promise<FakeSnapshot>;
  set: (data: unknown) => Promise<void>;
}

interface FakeTx {
  get: (ref: FakeRef) => Promise<FakeSnapshot>;
  set: (ref: FakeRef, data: unknown) => Promise<void>;
}

interface FakeFirestore {
  collection: () => { doc: (path: string) => FakeRef };
  doc: (path: string) => FakeRef;
  runTransaction: (fn: (tx: FakeTx) => Promise<unknown>) => Promise<unknown>;
  _docs: Map<string, unknown>;
}

function makeSnapshot(data: unknown, exists: boolean, id: string): FakeSnapshot {
  return { exists, id, data: () => data };
}

function makeFakeFirestore(): FakeFirestore {
  const docs = new Map<string, unknown>();

  function makeRef(path: string): FakeRef {
    return {
      path,
      get: vi.fn().mockImplementation(async (): Promise<FakeSnapshot> => {
        const data = docs.get(path);
        if (data === undefined) {
          return makeSnapshot(undefined, false, path.split('/').pop() ?? path);
        }
        return makeSnapshot(data, true, path.split('/').pop() ?? path);
      }),
      set: vi.fn().mockImplementation(async (data: unknown): Promise<void> => {
        docs.set(path, data);
      }),
    };
  }

  const collectionObj = {
    doc: vi.fn().mockImplementation((path: string): FakeRef => makeRef(path)),
  };

  return {
    collection: vi.fn().mockReturnValue(collectionObj),
    doc: vi.fn().mockImplementation((path: string): FakeRef => makeRef(path)),
    runTransaction: vi
      .fn()
      .mockImplementation(async (fn: (tx: FakeTx) => Promise<unknown>): Promise<unknown> => {
        const tx: FakeTx = {
          get: vi.fn().mockImplementation(async (ref: FakeRef): Promise<FakeSnapshot> => ref.get()),
          set: vi
            .fn()
            .mockImplementation(async (ref: FakeRef, data: unknown): Promise<void> =>
              ref.set(data),
            ),
        };
        return fn(tx);
      }),
    _docs: docs,
  };
}

function hash(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function storedDoc(db: FakeFirestore, keyHash: string): Record<string, unknown> {
  const value = db._docs.get(keyHash);
  return value as Record<string, unknown>;
}

describe('createFirestoreRateLimiter', () => {
  it('hashea la clave y usa el hash como id del documento', async () => {
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db);
    const key = 'clave-prueba';
    const expectedHash = hash(key);

    await limiter.check(key, 10, 60);

    const stored = storedDoc(fakeDb, expectedHash);
    expect(stored).toBeDefined();
    expect(stored.keyHash).toBe(expectedHash);
  });

  it('no persiste la clave en claro', async () => {
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db);
    const key = 'clave-con-pii';
    const expectedHash = hash(key);

    await limiter.check(key, 10, 60);

    const stored = storedDoc(fakeDb, expectedHash);
    expect(stored.key).toBeUndefined();
    expect(stored.keyHash).toBe(expectedHash);
    expect(Object.keys(stored)).not.toContain(key);
  });

  it('increments within window', async () => {
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db);
    const key = 'usuario-1';

    for (let i = 0; i < 5; i++) {
      await expect(limiter.check(key, 5, 60)).resolves.toBeUndefined();
    }

    const stored = storedDoc(fakeDb, hash(key));
    expect(stored.count).toBe(5);
  });

  it('rejects sixth attempt', async () => {
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db);
    const key = 'usuario-1';

    for (let i = 0; i < 5; i++) {
      await limiter.check(key, 5, 60);
    }

    await expect(limiter.check(key, 5, 60)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it('resetea el contador al expirar la ventana', async () => {
    let nowMs = 1_000_000;
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db, { now: () => nowMs, ttlSeconds: 300 });
    const key = 'usuario-1';

    for (let i = 0; i < 3; i++) {
      await limiter.check(key, 3, 60);
    }
    await expect(limiter.check(key, 3, 60)).rejects.toBeInstanceOf(RateLimitedError);

    nowMs += 60 * 1000 + 1;

    await expect(limiter.check(key, 3, 60)).resolves.toBeUndefined();
    const stored = storedDoc(fakeDb, hash(key));
    expect(stored.count).toBe(1);
    expect(stored.windowStart).toBe(nowMs);
  });

  it('expiresAt es now + 300000 ms por defecto', async () => {
    const nowMs = 1_000_000;
    const fakeDb = makeFakeFirestore();
    const db = fakeDb as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db, { now: () => nowMs, ttlSeconds: 300 });
    const key = 'usuario-1';

    await limiter.check(key, 10, 60);

    const stored = storedDoc(fakeDb, hash(key));
    expect(stored.expiresAt).toBeInstanceOf(Timestamp);
    const expiresAt = stored.expiresAt as Timestamp;
    expect(expiresAt.toMillis()).toBe(nowMs + 300_000);
  });

  it('propaga errores de Firestore', async () => {
    const base = makeFakeFirestore();
    const db = {
      ...base,
      runTransaction: vi.fn().mockRejectedValue(new Error('firestore down')),
    } as unknown as Firestore;
    const limiter = createFirestoreRateLimiter(db);

    await expect(limiter.check('key', 10, 60)).rejects.toThrow('firestore down');
  });
});
