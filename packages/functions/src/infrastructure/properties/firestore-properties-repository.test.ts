import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestorePropertiesRepository } from './firestore-properties-repository';
import type { CrearPropertyInputDto } from '../../application/ports/properties-repository';
import { errorCode } from '../../domain/errors/errorCatalog';
import { errPropertyNotFound } from '../../domain/errors/error-messages';

function makeMockDocSnapshot(data: unknown, exists = true, docId = 'doc-1') {
  return {
    exists,
    id: docId,
    data: () => data,
  } as unknown as { exists: boolean; id: string; data: () => unknown };
}

type ColeccionQueryMock = {
  _calls: { method: string; args: unknown[] }[];
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  startAfter: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

function hasUndefinedValues(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasUndefinedValues);
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some(hasUndefinedValues);
  }
  return value === undefined;
}

function makeMockFirestore(): Firestore & {
  _docs: Map<string, Record<string, unknown>>;
  _collectionQuery: ColeccionQueryMock;
} {
  const docs = new Map<string, Record<string, unknown>>();
  docs.set('counters/property', { secuencial: 0 });
  const collectionQuery: ColeccionQueryMock = {
    _calls: [],
    where: vi.fn().mockImplementation(function (...args: unknown[]) {
      collectionQuery._calls.push({ method: 'where', args });
      return collectionQuery;
    }),
    limit: vi.fn().mockImplementation(function (...args: unknown[]) {
      collectionQuery._calls.push({ method: 'limit', args });
      return collectionQuery;
    }),
    orderBy: vi.fn().mockImplementation(function (...args: unknown[]) {
      collectionQuery._calls.push({ method: 'orderBy', args });
      return collectionQuery;
    }),
    startAfter: vi.fn().mockImplementation(function (...args: unknown[]) {
      collectionQuery._calls.push({ method: 'startAfter', args });
      return collectionQuery;
    }),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  };

  function makeDocRef(path: string) {
    return {
      path,
      get: vi.fn().mockImplementation(() => {
        const existing = docs.get(path);
        return Promise.resolve(
          existing
            ? makeMockDocSnapshot(existing, true, path.split('/').pop())
            : makeMockDocSnapshot(null, false, path.split('/').pop()),
        );
      }),
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
  }

  return {
    collection: vi.fn().mockReturnValue(collectionQuery),
    doc: vi.fn().mockImplementation(makeDocRef),
    runTransaction: vi.fn().mockImplementation(
      async (
        fn: (tx: {
          get: (ref: { path: string }) => Promise<{
            exists: boolean;
            id: string;
            data: () => unknown;
          }>;
          set: (ref: { path: string }, data: unknown, options?: unknown) => Promise<void>;
          update: (ref: { path: string }, data: unknown) => Promise<void>;
        }) => Promise<unknown>,
      ) => {
        let escrituraRealizada = false;
        const tx = {
          get: vi.fn().mockImplementation((ref: { path: string }) => {
            if (escrituraRealizada) {
              throw new Error(
                'Firestore transactions require all reads to be executed before all writes.',
              );
            }
            const existing = docs.get(ref.path);

            return Promise.resolve(
              existing
                ? makeMockDocSnapshot(existing, true, ref.path.split('/').pop())
                : makeMockDocSnapshot(null, false, ref.path.split('/').pop()),
            );
          }),
          set: vi.fn().mockImplementation((ref: { path: string }, data: unknown) => {
            escrituraRealizada = true;
            docs.set(ref.path, data as Record<string, unknown>);
            return Promise.resolve();
          }),
          update: vi.fn().mockImplementation((ref: { path: string }, data: unknown) => {
            escrituraRealizada = true;
            const current = (docs.get(ref.path) ?? {}) as Record<string, unknown>;
            docs.set(ref.path, { ...current, ...(data as Record<string, unknown>) });
            return Promise.resolve();
          }),
        };
        return fn(tx);
      },
    ),
    _docs: docs,
    _collectionQuery: collectionQuery,
  } as unknown as Firestore & {
    _docs: Map<string, Record<string, unknown>>;
    _collectionQuery: ColeccionQueryMock;
  };
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

  it('omite campos opcionales ausentes al crear una propiedad', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'x' },
      precio: 1,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    const documento = [...db._docs.entries()].find(([ruta]) => ruta.startsWith('properties/'));

    expect(documento).toBeDefined();
    expect(hasUndefinedValues(documento?.[1])).toBe(false);
  });

  it('crea una propiedad preservando autoTranslate y enPendiente en titulo', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const resultado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta', en: 'House for sale', autoTranslate: false },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    expect(resultado.property.titulo.es).toBe('Casa en venta');
    expect(resultado.property.titulo.en).toBe('House for sale');
    expect(resultado.property.titulo.autoTranslate).toBe(false);
    expect(resultado.property.titulo.enPendiente).toBe(false);
  });

  it('crea una propiedad con autoTranslate true y sin en -> enPendiente true', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const resultado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta', autoTranslate: true },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    expect(resultado.property.titulo.es).toBe('Casa en venta');
    expect(resultado.property.titulo.en).toBeUndefined();
    expect(resultado.property.titulo.autoTranslate).toBe(true);
    expect(resultado.property.titulo.enPendiente).toBe(true);
  });

  it('crea una propiedad con descripcion, acabados, puntosInteres y proyecto.etapa', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const input: CrearPropertyInputDto = {
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa en venta' },
      descripcion: { es: 'Descripción', autoTranslate: true },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
      acabados: { es: 'Acabados de lujo', autoTranslate: true },
      puntosInteres: [
        { categoria: 'EDUCACION', etiqueta: { es: 'Colegio cercano', autoTranslate: true } },
        { etiqueta: { es: 'Parque personalizado', en: 'Custom park' } },
      ],
      proyecto: { etapa: { es: 'En construcción', autoTranslate: true } },
    };

    const resultado = await repo.create(input);

    expect(resultado.property.descripcion).toEqual({
      es: 'Descripción',
      autoTranslate: true,
      enPendiente: true,
    });
    expect(resultado.property.acabados).toEqual({
      es: 'Acabados de lujo',
      autoTranslate: true,
      enPendiente: true,
    });
    expect(resultado.property.puntosInteres).toEqual([
      {
        categoria: 'EDUCACION',
        etiqueta: { es: 'Colegio cercano', autoTranslate: true, enPendiente: true },
      },
      {
        etiqueta: {
          es: 'Parque personalizado',
          en: 'Custom park',
          autoTranslate: undefined,
          enPendiente: false,
        },
      },
    ]);
    expect(resultado.property.proyecto?.etapa).toEqual({
      es: 'En construcción',
      autoTranslate: true,
      enPendiente: true,
    });
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

    await expect(repo.update('inexistente', { precio: 200000000 })).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
  });

  it('update preserva autoTranslate y enPendiente en campos traducibles', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    // Primero crear una propiedad
    const creado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa original', autoTranslate: true },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    // Actualizar solo el precio
    const actualizado = await repo.update(creado.property.id, { precio: 200000000 });

    // Verificar que se preservan los campos traducibles
    expect(actualizado.property.titulo.es).toBe('Casa original');
    expect(actualizado.property.titulo.autoTranslate).toBe(true);
    expect(actualizado.property.titulo.enPendiente).toBe(true);
  });

  it('update actualiza campos traducibles con nuevos valores', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    const creado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa original', autoTranslate: true },
      descripcion: { es: 'Descripción original', autoTranslate: true },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    const actualizado = await repo.update(creado.property.id, {
      titulo: { es: 'Casa actualizada', en: 'Updated house', autoTranslate: false },
      descripcion: { es: 'Nueva descripción', autoTranslate: true },
    });

    expect(actualizado.property.titulo).toEqual({
      es: 'Casa actualizada',
      en: 'Updated house',
      autoTranslate: false,
      enPendiente: false,
    });
    expect(actualizado.property.descripcion).toEqual({
      es: 'Nueva descripción',
      autoTranslate: true,
      enPendiente: true,
    });
  });

  it('update devuelve el inmueble actualizado sin leer después de escribir en la transacción', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);
    const creado = await repo.create({
      operacion: 'VENTA',
      tipo: 'CASA',
      titulo: { es: 'Casa sin lectura posterior' },
      precio: 150000000,
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });

    const actualizado = await repo.update(creado.property.id, { precio: 200000000 });

    expect(actualizado.property.precio).toBe(200000000);
  });

  it('activate, hide y softDelete lanzan PROPERTY_NOT_FOUND si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);
    const esperado = {
      name: 'ApiError',
      code: errorCode.propertyNotFound,
      message: errPropertyNotFound('inexistente'),
    };

    await expect(repo.activate('inexistente')).rejects.toMatchObject(esperado);
    await expect(repo.hide('inexistente')).rejects.toMatchObject(esperado);
    await expect(repo.softDelete('inexistente')).rejects.toMatchObject(esperado);
  });
});

describe('listPublico: orden de consulta y cursor', () => {
  it('aplica todos los where antes de cualquier orderBy; precio primero con rango', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await repo.listPublico({
      operacion: 'VENTA',
      destacada: true,
      precioMin: 100000000,
      precioMax: 200000000,
    });

    const q = db._collectionQuery;
    expect(q.where.mock.calls).toEqual([
      ['operacion', '==', 'VENTA'],
      ['destacada', '==', true],
      ['status', '==', 'ACTIVE'],
      ['precio', '>=', 100000000],
      ['precio', '<=', 200000000],
    ]);
    expect(q.orderBy.mock.calls).toEqual([
      ['precio', 'asc'],
      ['createdAt', 'desc'],
      ['__name__', 'desc'],
    ]);

    const metodos = q._calls.map((llamada) => llamada.method);
    const ultimoWhere = metodos.lastIndexOf('where');
    const primerOrderBy = metodos.indexOf('orderBy');
    expect(primerOrderBy).toBeGreaterThan(ultimoWhere);
  });

  it('sin rango de precio ordena por createdAt y __name__', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await repo.listPublico({
      operacion: 'VENTA',
      destacada: true,
    });

    const q = db._collectionQuery;
    expect(q.where.mock.calls).toEqual([
      ['operacion', '==', 'VENTA'],
      ['destacada', '==', true],
      ['status', '==', 'ACTIVE'],
    ]);
    expect(q.orderBy.mock.calls).toEqual([
      ['createdAt', 'desc'],
      ['__name__', 'desc'],
    ]);
  });

  it('cursor resuelve el documento por id y startAfter recibe el snapshot', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);
    const cursorId = 'prop-cursor-1';
    db._docs.set(`properties/${cursorId}`, {
      precio: 150000000,
      createdAt: '2024-01-01T00:00:00Z',
    });

    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2024-01-01T00:00:00Z', id: cursorId }),
    ).toString('base64');

    await repo.listPublico({
      operacion: 'VENTA',
      destacada: true,
      precioMin: 100000000,
      precioMax: 200000000,
      cursor,
    });

    const q = db._collectionQuery;
    expect(db.doc).toHaveBeenCalledWith(`properties/${cursorId}`);
    expect(q.startAfter.mock.calls).toHaveLength(1);
    const [cursorSnap] = q.startAfter.mock.calls[0];
    expect(cursorSnap.exists).toBe(true);
    expect(cursorSnap.id).toBe(cursorId);
  });

  it('cursor de documento inexistente devuelve pagina vacia sin lanzar', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);
    const cursor = Buffer.from(
      JSON.stringify({ createdAt: '2024-01-01T00:00:00Z', id: 'no-existe' }),
    ).toString('base64');

    const resultado = await repo.listPublico({
      operacion: 'VENTA',
      destacada: true,
      precioMin: 100000000,
      precioMax: 200000000,
      cursor,
    });

    expect(resultado).toEqual({ items: [], nextCursor: undefined });
  });
});
