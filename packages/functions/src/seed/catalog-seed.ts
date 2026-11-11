/**
 * Seed de catálogo (US6.1, MT2.4)
 *
 * Siembra los datos de ejemplo del catálogo (inmuebles, servicios y documento
 * Nosotros) una vez existe el dominio de MT2.1/MT2.2. Idempotente (AC6.1.1):
 * si ya existen propiedades en Firestore, no hace cambios (0 cambios).
 * Usa traductor falso (AC0.5.9 / AC6.1.4): no llama al proveedor real.
 *
 * No descarga imágenes de internet, no usa fotos de personas reales, ni
 * direcciones o teléfonos reales (AC6.1.4).
 *
 * Los datos provienen de `catalog-data.ts` (fuente única de verdad).
 */

import { EstadoPropiedad } from '@jf/shared-types';

import {
  propiedadesCatalogo,
  serviciosCatalogo,
  aboutCatalogo,
  fechasCreacionCatalogo,
  codigosSecuencialesCatalogo,
} from './catalog-data';

const slugDe = (titulo: string, codigo: string): string =>
  `${titulo
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}-${codigo}`;

/**
 * Superficies de Firestore que usa el seed de catálogo.
 * Permite usar fakes en tests sin depender del tipo concreto del SDK.
 */
interface FirestoreLike {
  collection(name: string): {
    doc(path: string): { path: string; set(data: unknown): void };
    limit(n: number): { get(): Promise<{ empty: boolean }> };
  };
  doc(path: string): { path: string; set(data: unknown): void };
  batch(): {
    set(ref: { path?: string; set(data: unknown): void }, data: unknown): void;
    commit(): Promise<unknown>;
  };
}

/**
 * Result of running the catalog seed.
 */
export interface SeedCatalogResult {
  readonly propertiesCreated: number;
  readonly servicesCreated: number;
  readonly aboutUpserted: boolean;
  readonly changes: number;
  readonly idempotent: boolean;
}

/**
 * Siembra el catálogo de datos de ejemplo en Firestore.
 * Idempotente: si ya existen propiedades, no hace cambios (0 cambios).
 *
 * @param db - Cliente de Firestore (inyectado para testing).
 * @param dryRun - Si true, solo reporta qué haría sin persistir.
 * @returns Resultado del seed con conteo de cambios.
 */
export async function seedCatalog(
  db: FirestoreLike,
  dryRun: boolean = true,
): Promise<SeedCatalogResult> {
  const propiedades = db.collection('properties');
  const servicios = db.collection('services');

  // Idempotencia (AC6.1.1): si ya existen propiedades, no hay cambios.
  const existenteSnap = await propiedades.limit(1).get();
  const yaExistenDatos = !existenteSnap.empty;

  if (yaExistenDatos) {
    if (!dryRun) {
      console.log('Seed de catálogo: ya existen propiedades en Firestore. 0 cambios.');
    }
    return {
      propertiesCreated: 0,
      servicesCreated: 0,
      aboutUpserted: false,
      changes: 0,
      idempotent: true,
    };
  }

  if (dryRun) {
    console.log(
      `Seed de catálogo (dry-run): se sembrarían ${propiedadesCatalogo.length} propiedades, ${serviciosCatalogo.length} servicios y documento Nosotros.`,
    );
    return {
      propertiesCreated: propiedadesCatalogo.length,
      servicesCreated: serviciosCatalogo.length,
      aboutUpserted: true,
      changes: propiedadesCatalogo.length + serviciosCatalogo.length + 1,
      idempotent: false,
    };
  }

  const batch = db.batch();

  // 1) Inmuebles
  propiedadesCatalogo.forEach((prop, idx) => {
    const codigo = codigosSecuencialesCatalogo[idx];
    const slug = slugDe(prop.titulo.es, codigo);
    const createdAt = fechasCreacionCatalogo[idx];
    const status: EstadoPropiedad = codigo === 'JF-0017' ? 'HIDDEN' : 'ACTIVE';

    const data: Record<string, unknown> = {
      codigo,
      slug,
      status,
      operacion: prop.operacion,
      tipo: prop.tipo,
      titulo: prop.titulo,
      descripcion: prop.descripcion,
      precio: prop.precio,
      departamento: prop.departamento,
      municipio: prop.municipio,
      createdAt,
      updatedAt: createdAt,
      destacada: prop.destacada ?? false,
    };

    if (prop.estrato !== undefined) data.estrato = prop.estrato;
    if (prop.predial !== undefined) data.predial = prop.predial;
    if (prop.administracion !== undefined) data.administracion = prop.administracion;
    if (prop.acabados !== undefined) data.acabados = prop.acabados;
    if (prop.antiguedad !== undefined) data.antiguedad = prop.antiguedad;
    if (prop.areaConstruida !== undefined) data.areaConstruida = prop.areaConstruida;
    if (prop.areaLote !== undefined) data.areaLote = prop.areaLote;
    if (prop.dormitorios !== undefined) data.dormitorios = prop.dormitorios;
    if (prop.banos !== undefined) data.banos = prop.banos;
    if (prop.parqueaderos !== undefined) data.parqueaderos = prop.parqueaderos;
    if (prop.deposito !== undefined) data.deposito = prop.deposito;
    if (prop.amenidades !== undefined) data.amenidades = prop.amenidades;
    if (prop.puntosInteres !== undefined) data.puntosInteres = prop.puntosInteres;
    if (prop.fotos !== undefined) data.fotos = prop.fotos;
    if (prop.videos !== undefined) data.videos = prop.videos;
    if (prop.panoramas !== undefined) data.panoramas = prop.panoramas;
    if (prop.proyecto !== undefined) data.proyecto = prop.proyecto;

    const id = `prop-${idx + 1}`;
    batch.set(propiedades.doc(id), data);
  });

  // 2) Servicios
  serviciosCatalogo.forEach((servicio, idx) => {
    const id = `serv-${idx + 1}`;
    batch.set(servicios.doc(id), {
      slug: servicio.slug,
      status: servicio.status,
      titulo: servicio.titulo,
      resumen: servicio.resumen,
      cuerpo: servicio.cuerpo,
      orden: servicio.orden,
      fotos: servicio.fotos,
      updatedAt: servicio.updatedAt,
    });
  });

  // 3) Documento Nosotros (único: pages/nosotros)
  batch.set(db.doc('pages/nosotros'), aboutCatalogo);

  if (!dryRun) {
    await batch.commit();
    console.log(
      `Seed de catálogo completado: ${propiedadesCatalogo.length} propiedades, ${serviciosCatalogo.length} servicios, documento Nosotros.`,
    );
  }

  return {
    propertiesCreated: propiedadesCatalogo.length,
    servicesCreated: serviciosCatalogo.length,
    aboutUpserted: true,
    changes: propiedadesCatalogo.length + serviciosCatalogo.length + 1,
    idempotent: false,
  };
}
