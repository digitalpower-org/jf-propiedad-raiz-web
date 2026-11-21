import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestoreAboutRepository } from './firestore-about-repository';
import type { AboutDtoInput } from '../../application/ports/about-repository';
import { errorCode } from '../../domain/errors/errorCatalog';

interface FakeSnapshot {
  exists: boolean;
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
  doc: (path: string) => FakeRef;
  runTransaction: (fn: (tx: FakeTx) => Promise<unknown>) => Promise<unknown>;
  _docs: Map<string, unknown>;
}

function makeSnapshot(data: unknown, exists: boolean): FakeSnapshot {
  return { exists, data: () => data };
}

function makeFakeFirestore(): FakeFirestore {
  const docs = new Map<string, unknown>();

  function makeRef(path: string): FakeRef {
    return {
      path,
      get: vi.fn().mockImplementation(async (): Promise<FakeSnapshot> => {
        const data = docs.get(path);
        if (data === undefined) {
          return makeSnapshot(undefined, false);
        }
        return makeSnapshot(data, true);
      }),
      set: vi.fn().mockImplementation(async (data: unknown): Promise<void> => {
        docs.set(path, data);
      }),
    };
  }

  return {
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

const input: AboutDtoInput = {
  titulo: { es: 'Sobre nosotros', en: 'About us', autoTranslate: false },
  extracto: {
    es: 'Somos una inmobiliaria',
    en: 'We are a real estate agency',
    autoTranslate: false,
  },
  secciones: [
    {
      id: 's1',
      titulo: { es: 'Visión', en: 'Vision' },
      cuerpo: { es: 'Ser los mejores', en: 'Be the best' },
    },
  ],
  equipo: [
    { id: 'e1', nombre: 'Juan Pérez', cargo: { es: 'Gerente', en: 'Manager' }, foto: 'foto1.jpg' },
  ],
};

describe('createFirestoreAboutRepository.guardar', () => {
  it('actualiza el documento y devuelve updatedAt nuevo cuando el expectedUpdatedAt coincide', async () => {
    const db = makeFakeFirestore();
    const repo = createFirestoreAboutRepository(db as unknown as Firestore);
    const ref = db.doc('pages/nosotros');
    const existingUpdatedAt = '2024-01-01T00:00:00.000Z';
    await ref.set({ updatedAt: existingUpdatedAt, titulo: { es: 'Viejo' } });

    const resultado = await repo.guardar(input, existingUpdatedAt);

    expect(resultado.updatedAt).not.toBe(existingUpdatedAt);
    expect(resultado.titulo.es).toBe('Sobre nosotros');
    expect(resultado.extracto.es).toBe('Somos una inmobiliaria');
    expect(resultado.secciones).toHaveLength(1);
    expect(resultado.equipo).toHaveLength(1);
    const escrito = db._docs.get('pages/nosotros') as Record<string, unknown>;
    expect(escrito.updatedAt).toBe(resultado.updatedAt);
    expect(escrito.titulo).toEqual({ es: 'Sobre nosotros', en: 'About us', autoTranslate: false });
  });

  it('lanza ApiError con código CONFLICT cuando updatedAt está desactualizado', async () => {
    const db = makeFakeFirestore();
    const repo = createFirestoreAboutRepository(db as unknown as Firestore);
    const ref = db.doc('pages/nosotros');
    await ref.set({ updatedAt: '2024-01-01T00:00:00.000Z' });

    await expect(repo.guardar(input, '2024-01-02T00:00:00.000Z')).rejects.toMatchObject({
      code: errorCode.conflict,
    });
  });
});
