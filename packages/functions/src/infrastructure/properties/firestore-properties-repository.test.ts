import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestorePropertiesRepository } from './firestore-properties-repository';
import type { CrearPropertyInputDto } from '../../application/ports/properties-repository';

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
      return {
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
    }),
    runTransaction: vi
      .fn()
      .mockImplementation(
        async (
          fn: (tx: {
            get: () => Promise<{ secuencial: number }>;
            set: () => Promise<void>;
          }) => Promise<unknown>,
        ) => {
          const tx = {
            get: vi.fn().mockResolvedValue(makeMockDocSnapshot({ secuencial: 0 }, true)),
            set: vi.fn().mockResolvedValue(undefined),
          };
          return fn(tx);
        },
      ),
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

  it('activate, hide y softDelete lanzan error si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestorePropertiesRepository(db);

    await expect(repo.activate('inexistente')).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
    await expect(repo.hide('inexistente')).rejects.toThrow('Inmueble no encontrado: inexistente');
    await expect(repo.softDelete('inexistente')).rejects.toThrow(
      'Inmueble no encontrado: inexistente',
    );
  });
});
