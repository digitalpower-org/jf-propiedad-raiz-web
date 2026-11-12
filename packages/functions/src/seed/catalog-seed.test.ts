import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SeedCatalogResult } from './catalog-seed';
import { seedCatalog } from './catalog-seed';

// ---------------------------------------------------------------------------
// Fake de Firestore para tests (sin SDK real, sin emulador)
// ---------------------------------------------------------------------------

interface BatchOp {
  readonly refPath: string;
  readonly data: unknown;
}

class FakeDocRef {
  readonly path: string;
  readonly sets: unknown[] = [];

  constructor(path: string) {
    this.path = path;
  }

  set(data: unknown): void {
    this.sets.push(data);
  }
}

class FakeCollectionRef {
  readonly name: string;
  readonly docs: Map<string, FakeDocRef> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  doc(path: string): FakeDocRef {
    let doc = this.docs.get(path);
    if (!doc) {
      doc = new FakeDocRef(path);
      this.docs.set(path, doc);
    }
    return doc;
  }

  limit(_n: number): FakeQuery {
    return new FakeQuery(this, this.docs.size === 0);
  }
}

class FakeQuery {
  readonly collection: FakeCollectionRef;
  private _empty: boolean;

  constructor(collection: FakeCollectionRef, empty: boolean = true) {
    this.collection = collection;
    this._empty = empty;
  }

  setEmpty(empty: boolean): void {
    this._empty = empty;
  }

  async get(): Promise<{ empty: boolean }> {
    return { empty: this._empty };
  }
}

class FakeBatch {
  readonly ops: BatchOp[] = [];
  committed = false;

  set(ref: FakeDocRef, data: unknown): void {
    this.ops.push({ refPath: ref.path, data });
  }

  async commit(): Promise<void> {
    this.committed = true;
  }
}

class FakeFirestore {
  readonly collections: Map<string, FakeCollectionRef> = new Map();
  readonly batches: FakeBatch[] = [];

  collection(name: string): FakeCollectionRef {
    let coll = this.collections.get(name);
    if (!coll) {
      coll = new FakeCollectionRef(name);
      this.collections.set(name, coll);
    }
    return coll;
  }

  doc(path: string): FakeDocRef {
    return new FakeDocRef(path);
  }

  batch(): FakeBatch {
    const batch = new FakeBatch();
    this.batches.push(batch);
    return batch;
  }
}

function makeDb(existingProperties: boolean = false): FakeFirestore {
  const db = new FakeFirestore();
  if (existingProperties) {
    const coll = db.collection('properties');
    // Simular que ya hay al menos un documento
    coll.doc('prop-existing').set({ codigo: 'JF-9999' });
  }
  return db;
}

// ---------------------------------------------------------------------------
// Helpers de aserción sobre los datos sembrados
// ---------------------------------------------------------------------------

function ultimoBatch(db: FakeFirestore): FakeBatch {
  const batches = db.batches;
  expect(batches.length).toBeGreaterThan(0);
  return batches[batches.length - 1];
}

function datosPropiedades(batch: FakeBatch): unknown[] {
  return batch.ops.filter((op) => op.refPath.startsWith('prop-')).map((op) => op.data);
}

function datosServicios(batch: FakeBatch): unknown[] {
  return batch.ops.filter((op) => op.refPath.startsWith('serv-')).map((op) => op.data);
}

function datosAbout(batch: FakeBatch): unknown[] {
  return batch.ops.filter((op) => op.refPath === 'pages/nosotros').map((op) => op.data);
}

describe('catalog-seed (US6.1, MT2.4)', () => {
  let db: FakeFirestore;

  beforeEach(() => {
    db = makeDb(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('idempotencia (AC6.1.1)', () => {
    it('segunda ejecución informa 0 cambios cuando ya existen propiedades', async () => {
      const dbConDatos = makeDb(true);

      const resultado = await seedCatalog(dbConDatos, false);

      expect(resultado.idempotent).toBe(true);
      expect(resultado.changes).toBe(0);
      expect(resultado.propertiesCreated).toBe(0);
      expect(resultado.servicesCreated).toBe(0);
      expect(resultado.aboutUpserted).toBe(false);
      expect(dbConDatos.batches.length).toBe(0);
    });

    it('dry-run con datos existentes también informa 0 cambios', async () => {
      const dbConDatos = makeDb(true);

      const resultado = await seedCatalog(dbConDatos, true);

      expect(resultado.idempotent).toBe(true);
      expect(resultado.changes).toBe(0);
    });
  });

  describe('persistencia real (dry-run=false)', () => {
    it('escribe 20 propiedades, 3 servicios y documento Nosotros', async () => {
      const resultado = await seedCatalog(db, false);

      expect(resultado.idempotent).toBe(false);
      expect(resultado.changes).toBe(20 + 3 + 1);
      expect(resultado.propertiesCreated).toBe(20);
      expect(resultado.servicesCreated).toBe(3);
      expect(resultado.aboutUpserted).toBe(true);

      const batch = ultimoBatch(db);
      expect(batch.committed).toBe(true);

      const props = datosPropiedades(batch);
      expect(props).toHaveLength(20);

      const svcs = datosServicios(batch);
      expect(svcs).toHaveLength(3);

      const about = datosAbout(batch);
      expect(about).toHaveLength(1);
    });

    it('todas las propiedades tienen código JF-XXXX secuencial', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const codigos = props.map((p) => (p as { codigo: string }).codigo);
      expect(codigos).toEqual([
        'JF-0001',
        'JF-0002',
        'JF-0003',
        'JF-0004',
        'JF-0005',
        'JF-0006',
        'JF-0007',
        'JF-0008',
        'JF-0009',
        'JF-0010',
        'JF-0011',
        'JF-0012',
        'JF-0013',
        'JF-0014',
        'JF-0015',
        'JF-0016',
        'JF-0017',
        'JF-0018',
        'JF-0019',
        'JF-0020',
      ]);
    });

    it('tiene al menos 13 inmuebles ACTIVE en VENTA (AC6.1.2)', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const ventaActivas = props.filter(
        (p) =>
          (p as { operacion: string }).operacion === 'VENTA' &&
          (p as { status: string }).status === 'ACTIVE',
      );
      expect(ventaActivas.length).toBeGreaterThanOrEqual(13);
    });

    it('tiene al menos 1 inmueble HIDDEN (AC6.1.2)', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const hidden = props.filter((p) => (p as { status: string }).status === 'HIDDEN');
      expect(hidden.length).toBeGreaterThanOrEqual(1);

      const hiddenCodigo = hidden.map((p) => (p as { codigo: string }).codigo);
      expect(hiddenCodigo).toContain('JF-0017');
    });

    it('tiene al menos 1 inmueble destacada', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const destacadas = props.filter((p) => (p as { destacada: boolean }).destacada === true);
      expect(destacadas.length).toBeGreaterThanOrEqual(1);
    });

    it('tiene un proyecto sobre planos con campos propios', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const proyecto = props.find(
        (p) => (p as { operacion: string }).operacion === 'PROYECTO_SOBRE_PLANOS',
      );
      expect(proyecto).toBeDefined();
      expect((proyecto as { proyecto?: unknown }).proyecto).toBeDefined();
      const proj = (
        proyecto as {
          proyecto: { etapa: unknown; fechaEntregaEstimada: unknown; unidadesDisponibles: unknown };
        }
      ).proyecto;
      expect(proj.etapa).toBeDefined();
      expect(proj.fechaEntregaEstimada).toBe('2026-12');
      expect(proj.unidadesDisponibles).toBe(15);
    });

    it('algunas propiedades tienen campo en completo y otras sin él', async () => {
      await seedCatalog(db, false);

      const batch = ultimoBatch(db);
      const props = datosPropiedades(batch);

      const titulos = props.map((p) => (p as { titulo: { es: string; en?: string } }).titulo);
      const conEn = titulos.filter((t) => t.en !== undefined && t.en !== '');
      const sinEn = titulos.filter((t) => t.en === undefined || t.en === '');

      expect(conEn.length).toBeGreaterThan(0);
      expect(sinEn.length).toBeGreaterThan(0);
    });

    it('no llama al proveedor real de traducción (usa traductor falso, AC6.1.4)', async () => {
      const translateSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await seedCatalog(db, false);

      const output = translateSpy.mock.calls.map((args) => args.join(' ')).join('\n');

      // No debe mencionar Google Cloud Translation ni credenciales reales
      expect(output).not.toContain('Google Cloud Translation');
      expect(output).not.toContain('translate');
      translateSpy.mockRestore();
    });
  });

  describe('dry-run (dryRun=true)', () => {
    it('no persiste nada en Firestore', async () => {
      const resultado = await seedCatalog(db, true);

      expect(resultado.idempotent).toBe(false);
      expect(resultado.changes).toBe(20 + 3 + 1);
      expect(db.batches.length).toBe(0);
      expect(db.collection('properties').docs.size).toBe(0);
    });

    it('reporta cuántos datos se sembrarían', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await seedCatalog(db, true);

      const output = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
      expect(output).toContain('20 propiedades');
      expect(output).toContain('3 servicios');
      logSpy.mockRestore();
    });
  });
});

describe('catalog-seed result type', () => {
  it('SeedCatalogResult tiene los campos esperados', () => {
    const resultado: SeedCatalogResult = {
      propertiesCreated: 20,
      servicesCreated: 3,
      aboutUpserted: true,
      changes: 24,
      idempotent: false,
    };

    expect(resultado.propertiesCreated).toBe(20);
    expect(resultado.servicesCreated).toBe(3);
    expect(resultado.aboutUpserted).toBe(true);
    expect(resultado.changes).toBe(24);
    expect(resultado.idempotent).toBe(false);
  });
});
