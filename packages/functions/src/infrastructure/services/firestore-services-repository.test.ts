import { describe, expect, it, vi } from 'vitest';

import type { Firestore } from 'firebase-admin/firestore';
import { createFirestoreServicesRepository } from './firestore-services-repository';
import { errorCode } from '../../domain/errors/errorCatalog';

// Extended Firestore type for test mock internals
interface MockFirestore extends Firestore {
  _docs: Map<string, Record<string, unknown>>;
  _batchOps: Array<{ ref: string; data: Record<string, unknown> }>;
  _mockBatch: {
    update: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
  };
}

function makeMockDocSnapshot(
  data: unknown,
  exists = true,
  docId = 'doc-1',
  ref?: { update: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> },
) {
  return {
    exists,
    id: docId,
    data: () => data,
    ref: ref ?? {
      update: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ exists: true, id: docId, data: () => data }),
    },
  } as unknown as {
    exists: boolean;
    id: string;
    data: () => unknown;
    ref: { update: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
  };
}

function makeMockFirestore(): MockFirestore {
  const docs = new Map<string, Record<string, unknown>>();
  const batchOps: Array<{ ref: string; data: Record<string, unknown> }> = [];

  const createRef = (path: string) => {
    return {
      update: vi.fn().mockImplementation((data: Record<string, unknown>) => {
        const current = (docs.get(path) ?? {}) as Record<string, unknown>;
        docs.set(path, { ...current, ...data });
        return Promise.resolve();
      }),
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
      path,
    };
  };

  // Create a query builder that properly chains
  const createQuery = (
    baseFilters: Array<{ field: string; op: string; value: unknown }> = [],
    baseOrderBy: Array<{ field: string; direction: string }> = [],
  ) => {
    const whereFilters = [...baseFilters];
    const orderByFields = [...baseOrderBy];

    const query = {
      where: vi.fn().mockImplementation((field: string, op: string, value: unknown) => {
        const q = createQuery([...whereFilters, { field, op, value }], orderByFields);
        q._limitVal = query._limitVal;
        q._startAfterVals = query._startAfterVals;
        return q;
      }),
      orderBy: vi.fn().mockImplementation((field: string, direction?: string) => {
        const q = createQuery(whereFilters, [
          ...orderByFields,
          { field, direction: direction ?? 'asc' },
        ]);
        q._limitVal = query._limitVal;
        q._startAfterVals = query._startAfterVals;
        return q;
      }),
      limit: vi.fn().mockImplementation((lim: number) => {
        const q = createQuery(whereFilters, orderByFields);
        q._limitVal = lim;
        return q;
      }),
      startAfter: vi.fn().mockImplementation((...vals: unknown[]) => {
        const q = createQuery(whereFilters, orderByFields);
        q._limitVal = query._limitVal;
        q._startAfterVals = vals;
        return q;
      }),
      get: vi.fn().mockImplementation(async () => {
        // Filter docs based on where clauses
        let results = Array.from(docs.entries()).map(([path, data]) => ({
          id: path.split('/').pop()!,
          path,
          data,
        }));

        for (const filter of whereFilters) {
          results = results.filter((r) => {
            const val = r.data[filter.field] as string | number | boolean;
            const fval = filter.value as string | number | boolean;
            switch (filter.op) {
              case '==':
                return val === fval;
              case '!=':
              case '!==':
                return val !== fval;
              case '>=':
                return val >= fval;
              case '<=':
                return val <= fval;
              default:
                return true;
            }
          });
        }

        // Sort by orderBy fields using compound comparator
        if (orderByFields.length > 0) {
          results.sort((a, b) => {
            for (const ob of orderByFields) {
              let av: string | number;
              let bv: string | number;
              if (ob.field === '__name__') {
                av = a.id;
                bv = b.id;
              } else {
                av = a.data[ob.field] as string | number;
                bv = b.data[ob.field] as string | number;
              }
              if (av < bv) return ob.direction === 'asc' ? -1 : 1;
              if (av > bv) return ob.direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }

        // Apply startAfter
        if (query._startAfterVals && query._startAfterVals.length > 0) {
          const [saOrden, saId] = query._startAfterVals as [number, string];
          results = results.filter((r) => {
            const orden = Number(r.data.orden ?? 0);
            if (orden > saOrden) return true;
            if (orden < saOrden) return false;
            return r.id > saId;
          });
        }

        // Apply limit
        if (query._limitVal !== undefined) {
          results = results.slice(0, query._limitVal);
        }

        const docSnaps = results.map((r) =>
          makeMockDocSnapshot(r.data, true, r.id, createRef(r.path)),
        );

        return {
          empty: results.length === 0,
          docs: docSnaps,
        };
      }),
      _limitVal: undefined as number | undefined,
      _startAfterVals: undefined as unknown[] | undefined,
    };
    return query;
  };

  const mockBatch = {
    update: vi.fn().mockImplementation((ref: { path: string }, data: Record<string, unknown>) => {
      batchOps.push({ ref: ref.path, data });
      return mockBatch;
    }),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  const collectionRef = {
    where: vi.fn().mockImplementation((field: string, op: string, value: unknown) => {
      return createQuery([{ field, op, value }], []);
    }),
    orderBy: vi.fn().mockImplementation((field: string, direction?: string) => {
      return createQuery([], [{ field, direction: direction ?? 'asc' }]);
    }),
    limit: vi.fn().mockImplementation((lim: number) => {
      const q = createQuery([], []);
      q._limitVal = lim;
      return q;
    }),
  };

  return {
    collection: vi.fn().mockReturnValue(collectionRef),
    doc: vi.fn().mockImplementation((path: string) => createRef(path)),
    batch: vi.fn().mockReturnValue(mockBatch),
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
    _batchOps: batchOps,
    _mockBatch: mockBatch,
  } as unknown as MockFirestore;
}

describe('createFirestoreServicesRepository', () => {
  it('crea un servicio con slug generado y estado HIDDEN', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const resultado = await repo.crear({
      titulo: { es: 'Estudios de Suelo' },
      resumen: { es: 'Análisis de suelos para construcción' },
      cuerpo: { es: 'Cuerpo completo del servicio...' },
    });

    expect(resultado.service.id).toBeDefined();
    expect(resultado.service.slug).toBe('estudios-de-suelo');
    expect(resultado.service.status).toBe('HIDDEN');
    expect(resultado.service.orden).toBe(0);
    expect(resultado.service.titulo.es).toBe('Estudios de Suelo');
    expect(resultado.service.resumen.es).toBe('Análisis de suelos para construcción');
    expect(resultado.service.cuerpo.es).toBe('Cuerpo completo del servicio...');
    expect(db.collection).toHaveBeenCalledWith('services');
  });

  it('crea un servicio preservando autoTranslate y enPendiente en campos traducibles', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const resultado = await repo.crear({
      titulo: { es: 'Estudios de Suelo', en: 'Soil Studies', autoTranslate: false },
      resumen: { es: 'Análisis de suelos', autoTranslate: true },
      cuerpo: { es: 'Cuerpo...', autoTranslate: true },
    });

    expect(resultado.service.titulo.es).toBe('Estudios de Suelo');
    expect(resultado.service.titulo.en).toBe('Soil Studies');
    expect(resultado.service.titulo.autoTranslate).toBe(false);
    expect(resultado.service.titulo.enPendiente).toBe(false);

    expect(resultado.service.resumen.es).toBe('Análisis de suelos');
    expect(resultado.service.resumen.en).toBeUndefined();
    expect(resultado.service.resumen.autoTranslate).toBe(true);
    expect(resultado.service.resumen.enPendiente).toBe(true);

    expect(resultado.service.cuerpo.es).toBe('Cuerpo...');
    expect(resultado.service.cuerpo.autoTranslate).toBe(true);
    expect(resultado.service.cuerpo.enPendiente).toBe(true);
  });

  it('crea un servicio con fotos y orden personalizado', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const fotos = [
      {
        derivados: [
          { clave: 'foto1-320.webp', ancho: 320, alto: 240 },
          { clave: 'foto1-640.webp', ancho: 640, alto: 480 },
        ],
      },
    ];

    const resultado = await repo.crear({
      titulo: { es: 'Cálculos Estructurales' },
      resumen: { es: 'Cálculos para estructuras' },
      cuerpo: { es: 'Detalles...' },
      fotos,
      orden: 5,
    });

    expect(resultado.service.fotos).toEqual(fotos);
    expect(resultado.service.orden).toBe(5);
  });

  it('actualizar lanza error si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    await expect(
      repo.actualizar('inexistente', { titulo: { es: 'Nuevo título' } }),
    ).rejects.toThrow('Servicio no encontrado: inexistente');
  });

  it('actualizar por slug encuentra y actualiza el documento', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Original' },
      resumen: { es: 'Resumen original' },
      cuerpo: { es: 'Cuerpo original' },
    });

    const actualizado = await repo.actualizar(creado.service.slug, {
      titulo: { es: 'Servicio Actualizado' },
      orden: 10,
    });

    expect(actualizado.service.titulo.es).toBe('Servicio Actualizado');
    expect(actualizado.service.orden).toBe(10);
    expect(actualizado.service.id).toBe(creado.service.id);
  });

  it('actualizar preserva autoTranslate y enPendiente en campos no modificados', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Original', autoTranslate: true },
      resumen: { es: 'Resumen', autoTranslate: true },
      cuerpo: { es: 'Cuerpo', autoTranslate: true },
    });

    const actualizado = await repo.actualizar(creado.service.id, { orden: 3 });

    expect(actualizado.service.titulo.es).toBe('Original');
    expect(actualizado.service.titulo.autoTranslate).toBe(true);
    expect(actualizado.service.titulo.enPendiente).toBe(true);
    expect(actualizado.service.resumen.autoTranslate).toBe(true);
    expect(actualizado.service.resumen.enPendiente).toBe(true);
    expect(actualizado.service.cuerpo.autoTranslate).toBe(true);
    expect(actualizado.service.cuerpo.enPendiente).toBe(true);
  });

  it('actualizar actualiza campos traducibles con nuevos valores', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Original', autoTranslate: true },
      resumen: { es: 'Resumen original', autoTranslate: true },
      cuerpo: { es: 'Cuerpo original', autoTranslate: true },
    });

    const actualizado = await repo.actualizar(creado.service.id, {
      titulo: { es: 'Actualizado', en: 'Updated', autoTranslate: false },
      resumen: { es: 'Nuevo resumen', autoTranslate: true },
    });

    expect(actualizado.service.titulo).toEqual({
      es: 'Actualizado',
      en: 'Updated',
      autoTranslate: false,
      enPendiente: false,
    });
    expect(actualizado.service.resumen).toEqual({
      es: 'Nuevo resumen',
      autoTranslate: true,
      enPendiente: true,
    });
    // cuerpo no modificado, se preserva
    expect(actualizado.service.cuerpo.es).toBe('Cuerpo original');
    expect(actualizado.service.cuerpo.autoTranslate).toBe(true);
    expect(actualizado.service.cuerpo.enPendiente).toBe(true);
  });

  it('eliminar hace soft delete (status DELETED)', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Para Eliminar' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.eliminar(creado.service.id);

    expect(resultado.service.status).toBe('DELETED');
    expect(resultado.service.id).toBe(creado.service.id);
  });

  it('eliminar por slug hace soft delete', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Para Eliminar Por Slug' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.eliminar(creado.service.slug);

    expect(resultado.service.status).toBe('DELETED');
    expect(resultado.service.slug).toBe(creado.service.slug);
  });

  it('activar cambia status a ACTIVE', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Para Activar' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.activar(creado.service.id);

    expect(resultado.service.status).toBe('ACTIVE');
    expect(resultado.service.id).toBe(creado.service.id);
  });

  it('ocultar cambia status a HIDDEN', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Para Ocultar' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    // Primero activar
    await repo.activar(creado.service.id);

    const resultado = await repo.ocultar(creado.service.id);

    expect(resultado.service.status).toBe('HIDDEN');
    expect(resultado.service.id).toBe(creado.service.id);
  });

  it('activar, ocultar y eliminar lanzan error si el documento no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    await expect(repo.activar('inexistente')).rejects.toThrow(
      'Servicio no encontrado: inexistente',
    );
    await expect(repo.ocultar('inexistente')).rejects.toThrow(
      'Servicio no encontrado: inexistente',
    );
    await expect(repo.eliminar('inexistente')).rejects.toThrow(
      'Servicio no encontrado: inexistente',
    );
  });

  it('reordenar usa una sola WriteBatch para toda la operación', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    // Crear varios servicios
    const s1 = await repo.crear({
      titulo: { es: 'Servicio 1' },
      resumen: { es: 'R1' },
      cuerpo: { es: 'C1' },
    });
    const s2 = await repo.crear({
      titulo: { es: 'Servicio 2' },
      resumen: { es: 'R2' },
      cuerpo: { es: 'C2' },
    });
    const s3 = await repo.crear({
      titulo: { es: 'Servicio 3' },
      resumen: { es: 'R3' },
      cuerpo: { es: 'C3' },
    });

    await repo.reordenar([
      { id: s1.service.id, orden: 3 },
      { id: s2.service.id, orden: 1 },
      { id: s3.service.id, orden: 2 },
    ]);

    // Verificar que batch.update se llamó 3 veces y batch.commit una vez
    expect(db._mockBatch.update).toHaveBeenCalledTimes(3);
    expect(db._mockBatch.commit).toHaveBeenCalledTimes(1);

    // Verificar que las actualizaciones tienen el orden correcto
    const updates = db._batchOps;
    expect(updates[0].data.orden).toBe(3);
    expect(updates[1].data.orden).toBe(1);
    expect(updates[2].data.orden).toBe(2);
    updates.forEach((u) => {
      expect(u.data.updatedAt).toBeDefined();
    });
  });

  it('obtenerPorIdOSlug devuelve null si no existe', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const resultado = await repo.obtenerPorIdOSlug('inexistente', true);

    expect(resultado).toBeNull();
  });

  it('obtenerPorIdOSlug por id devuelve el servicio', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Test' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.id, false);

    expect(resultado).not.toBeNull();
    expect(resultado!.service.id).toBe(creado.service.id);
    expect(resultado!.service.titulo.es).toBe('Servicio Test');
    expect(resultado!.esPublico).toBe(false);
  });

  it('obtenerPorIdOSlug por slug devuelve el servicio', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Por Slug' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.slug, false);

    expect(resultado).not.toBeNull();
    expect(resultado!.service.slug).toBe(creado.service.slug);
    expect(resultado!.service.titulo.es).toBe('Servicio Por Slug');
  });

  it('obtenerPorIdOSlug con esPublico=true filtra HIDDEN y DELETED', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    // Por defecto es HIDDEN
    const resultadoHidden = await repo.obtenerPorIdOSlug(creado.service.id, true);
    expect(resultadoHidden).toBeNull();

    // Activar
    await repo.activar(creado.service.id);
    const resultadoActive = await repo.obtenerPorIdOSlug(creado.service.id, true);
    expect(resultadoActive).not.toBeNull();
    expect(resultadoActive!.service.status).toBe('ACTIVE');

    // Eliminar (soft delete)
    await repo.eliminar(creado.service.id);
    const resultadoDeleted = await repo.obtenerPorIdOSlug(creado.service.id, true);
    expect(resultadoDeleted).toBeNull();
  });

  it('obtenerPorIdOSlug por id: HIDDEN con includeHidden=true devuelve el servicio', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.id, true, true);

    expect(resultado).not.toBeNull();
    expect(resultado!.service.status).toBe('HIDDEN');
    expect(resultado!.esPublico).toBe(true);
  });

  it('obtenerPorIdOSlug por id: HIDDEN sin includeHidden devuelve null', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.id, true);

    expect(resultado).toBeNull();
  });

  it('obtenerPorIdOSlug por id: DELETED con includeHidden=true devuelve null', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });
    await repo.eliminar(creado.service.id);

    const resultado = await repo.obtenerPorIdOSlug(creado.service.id, true, true);

    expect(resultado).toBeNull();
  });

  it('obtenerPorIdOSlug por slug: HIDDEN con includeHidden=true devuelve el servicio', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Por Slug Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.slug, true, true);

    expect(resultado).not.toBeNull();
    expect(resultado!.service.slug).toBe(creado.service.slug);
    expect(resultado!.service.status).toBe('HIDDEN');
  });

  it('obtenerPorIdOSlug por slug: HIDDEN sin includeHidden devuelve null', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const creado = await repo.crear({
      titulo: { es: 'Servicio Por Slug Hidden' },
      resumen: { es: 'Resumen' },
      cuerpo: { es: 'Cuerpo' },
    });

    const resultado = await repo.obtenerPorIdOSlug(creado.service.slug, true);

    expect(resultado).toBeNull();
  });

  it('listarPaginado devuelve items vacíos por defecto', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const resultado = await repo.listarPaginado({});

    expect(resultado.items).toEqual([]);
    expect(resultado.nextCursor).toBeUndefined();
  });

  it('listarPaginado usa límite por defecto 12', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    // Crear 15 servicios ACTIVE
    for (let i = 0; i < 15; i++) {
      const s = await repo.crear({
        titulo: { es: `Servicio ${i}` },
        resumen: { es: `Resumen ${i}` },
        cuerpo: { es: `Cuerpo ${i}` },
      });
      await repo.activar(s.service.id);
    }

    const resultado = await repo.listarPaginado({});

    expect(resultado.items.length).toBe(12);
    expect(resultado.nextCursor).toBeDefined();
  });

  it('listarPaginado respeta límite máximo 50', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    // Crear 60 servicios ACTIVE
    for (let i = 0; i < 60; i++) {
      const s = await repo.crear({
        titulo: { es: `Servicio ${i}` },
        resumen: { es: `Resumen ${i}` },
        cuerpo: { es: `Cuerpo ${i}` },
      });
      await repo.activar(s.service.id);
    }

    const resultado = await repo.listarPaginado({ limit: 100 }); // Pide 100, máx es 50

    expect(resultado.items.length).toBe(50);
    expect(resultado.nextCursor).toBeDefined();
  });

  it('listarPaginado usa cursor base64 { orden, id } con desempate por id', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    // Crear 3 servicios con mismo orden para probar desempate por id
    const s1 = await repo.crear({
      titulo: { es: 'A' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 1,
    });
    const s2 = await repo.crear({
      titulo: { es: 'B' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 1,
    });
    const s3 = await repo.crear({
      titulo: { es: 'C' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 2,
    });

    await repo.activar(s1.service.id);
    await repo.activar(s2.service.id);
    await repo.activar(s3.service.id);

    // Primera página con límite 2
    const pagina1 = await repo.listarPaginado({ limit: 2 });
    expect(pagina1.items.length).toBe(2);
    expect(pagina1.nextCursor).toBeDefined();

    // Decodificar cursor y verificar que contiene orden e id del último item
    const cursor = pagina1.nextCursor!;
    const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    expect(decoded).toHaveProperty('orden');
    expect(decoded).toHaveProperty('id');
    expect(typeof decoded.orden).toBe('number');
    expect(typeof decoded.id).toBe('string');

    // Segunda página usando cursor
    const pagina2 = await repo.listarPaginado({ cursor, limit: 2 });
    expect(pagina2.items.length).toBe(1); // Solo queda 1
    expect(pagina2.nextCursor).toBeUndefined();
  });

  it('listarPaginado rechaza cursor inválido con error', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    await expect(
      repo.listarPaginado({ cursor: 'cursor-invalido', limit: 12 }),
    ).rejects.toMatchObject({
      message: 'Cursor inválido',
      code: errorCode.validationError,
    });
    await expect(
      repo.listarPaginado({ cursor: Buffer.from('{invalido}').toString('base64'), limit: 12 }),
    ).rejects.toMatchObject({
      message: 'Cursor inválido',
      code: errorCode.validationError,
    });
    await expect(
      repo.listarPaginado({
        cursor: Buffer.from('{"orden": "no-numero", "id": "x"}').toString('base64'),
        limit: 12,
      }),
    ).rejects.toMatchObject({
      message: 'Cursor inválido',
      code: errorCode.validationError,
    });
    await expect(
      repo.listarPaginado({ cursor: Buffer.from('{"orden": 1}').toString('base64'), limit: 12 }),
    ).rejects.toMatchObject({
      message: 'Cursor inválido',
      code: errorCode.validationError,
    });
  });

  it('listarPaginado solo devuelve servicios ACTIVE', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const s1 = await repo.crear({
      titulo: { es: 'Activo' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
    });
    await repo.crear({ titulo: { es: 'Hidden' }, resumen: { es: 'R' }, cuerpo: { es: 'C' } });
    const s3 = await repo.crear({
      titulo: { es: 'Eliminado' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
    });

    await repo.activar(s1.service.id);
    // s2 queda HIDDEN
    await repo.eliminar(s3.service.id); // DELETED

    const resultado = await repo.listarPaginado({});

    expect(resultado.items.length).toBe(1);
    expect(resultado.items[0].id).toBe(s1.service.id);
  });

  it('listarPaginado includeHidden:true devuelve ACTIVE+HIDDEN y excluye DELETED', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    const s1 = await repo.crear({
      titulo: { es: 'Activo' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
    });
    const s2 = await repo.crear({
      titulo: { es: 'Hidden' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
    });
    const s3 = await repo.crear({
      titulo: { es: 'Eliminado' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
    });

    await repo.activar(s1.service.id);
    await repo.eliminar(s3.service.id);

    const porDefecto = await repo.listarPaginado({});
    expect(porDefecto.items.length).toBe(1);
    expect(porDefecto.items[0].id).toBe(s1.service.id);

    const sinOcultos = await repo.listarPaginado({ includeHidden: false });
    expect(sinOcultos.items.length).toBe(1);
    expect(sinOcultos.items[0].id).toBe(s1.service.id);

    const conOcultos = await repo.listarPaginado({ includeHidden: true });
    expect(conOcultos.items.length).toBe(2);
    const ids = conOcultos.items.map((i) => i.id).sort();
    expect(ids).toEqual([s1.service.id, s2.service.id].sort());
  });

  it('listarPaginado ordena por orden ascendente y desempata por id', async () => {
    const db = makeMockFirestore();
    const repo = createFirestoreServicesRepository(db);

    // Crear 3 servicios con orden conocido para verificar ordenamiento
    // Usamos IDs predecibles manipulando el mock directamente
    const id1 = 'aaa-aaa-aaa'; // menor
    const id2 = 'bbb-bbb-bbb'; // medio
    const id3 = 'ccc-ccc-ccc'; // mayor

    // Insertar directamente en el mock para controlar IDs
    const ahora = new Date().toISOString();
    db._docs.set(`services/${id1}`, {
      slug: 'z',
      status: 'ACTIVE',
      titulo: { es: 'Z' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 2,
      updatedAt: ahora,
    });
    db._docs.set(`services/${id2}`, {
      slug: 'a',
      status: 'ACTIVE',
      titulo: { es: 'A' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 1,
      updatedAt: ahora,
    });
    db._docs.set(`services/${id3}`, {
      slug: 'b',
      status: 'ACTIVE',
      titulo: { es: 'B' },
      resumen: { es: 'R' },
      cuerpo: { es: 'C' },
      orden: 1,
      updatedAt: ahora,
    });

    const resultado = await repo.listarPaginado({});

    // Debe ordenar por orden asc, luego por id asc (desempate)
    expect(resultado.items[0].id).toBe(id2); // orden 1, id menor (bbb)
    expect(resultado.items[1].id).toBe(id3); // orden 1, id mayor (ccc)
    expect(resultado.items[2].id).toBe(id1); // orden 2
  });
});
