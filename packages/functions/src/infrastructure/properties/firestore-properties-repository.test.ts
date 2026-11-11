import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestorePropertiesRepository } from './firestore-properties-repository';

function makeMockDocSnapshot(data: unknown, exists = true, docId = 'doc-1') {
  return {
    exists,
    id: docId,
    data: () => data,
  } as unknown as { exists: boolean; id: string; data: () => unknown };
}

function makeMockFirestore() {
  const docs = new Map<string, Record<string, unknown>>();
  const collectionQuery = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    startAfter: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: true,
      docs: [],
    }),
  };

  return {
    collection: vi.fn().mockReturnValue(collectionQuery),
    doc: vi.fn().mockImplementation((path: string) => {
      const existing = docs.get(path);
      return {
        get: vi.fn().mockResolvedValue(
          existing
            ? makeMockDocSnapshot(existing, true, path.split('/').pop())
            : makeMockDocSnapshot(null, false, path.split('/').pop()),
        ),
        set: vi.fn().mockImplementation((data: unknown) => {
          docs.set(path, data as Record<string, unknown>);
          return Promise.resolve();
        }),
        update: vi.fn().mockImplementation((data: unknown) => {
          const current = (docs.get(path) ?? {}) as Record<string, unknown>;
          docs.set(path, { ...current, ...(data as Record<string, unknown>) });
          return Promise.resolve();
        }),
      };
    }),
    runTransaction: vi.fn().mockImplementation(async (fn: (tx: { get: () => Promise<{ secuencial: number }>; set: () => Promise<void> }) => Promise<unknown>) => {
      const tx = {
        get: vi.fn().mockResolvedValue(makeMockDocSnapshot({ secuencial: 0 }, true)),
        set: vi.fn().mockResolvedValue(undefined),
      };
      return fn(tx);
    }),
    _docs: docs,
    _collectionQuery: collectionQuery,
  } as unknown as Firestore;
}

describe('createFirestorePropertiesRepository', () => {
  it('crea una propiedad y genera código secuencial', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const resultado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta' },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    expect(resultado.property.codigo).toMatch(/^JF-\d{4}$/);
    expect(resultado.property.slug).toMatch(/^casa-en-venta-JF-/);
    expect(resultado.property.status).toBe('HIDDEN');
    expect(db.collection).toHaveBeenCalledWith('properties');
  });

  it('findByIdOrSlug devuelve null si no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const resultado = await repo.findByIdOrSlug('inexistente', true);

    expect(resultado).toBeNull();
  });

  it('listPublico devuelve items vacíos por defecto', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const resultado = await repo.listPublico({
      operacion: 'VENTA',
      destacada: false,
    });

    expect(resultado.items).toEqual([]);
    expect(resultado.nextCursor).toBeUndefined();
  });

  it('update lanza error si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await expect(
      repo.update('inexistente', { precio: 200000000 }),
    ).rejects.toThrow('Inmueble no encontrado: inexistente');
  });

  it('activate, hide y softDelete lanzan error si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await expect(repo.activate('inexistente')).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
    await expect(repo.hide('inexistente')).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
    await expect(repo.softDelete('inexistente')).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
  });
});
