import type { Firestore } from 'firebase-admin/firestore';

import type { PropertiesRepository } from '../../application/ports/properties-repository';
import type {
  ActivarPropertyResult,
  CrearPropertyResult,
  EliminarPropertyResult,
  FiltrosListadoPublico,
  ListadoPublicoResult,
  ObtenerPropertyResult,
  OcultarPropertyResult,
  PropertyCardDto,
  PropertyDto,
  ActualizarPropertyInputDto,
  CrearPropertyInputDto,
} from '../../application/ports/properties-repository';
import type { EstadoPropiedad } from '@jf/shared-types';

import { errPropertyNotFound } from '../../domain/errors/error-messages';

const CODIGOS_SECUENCIALES = 'counters';
const DOC_CODIGO_PROPIEDAD = 'property';

/**
 * Mapea un documento de Firestore a un `PropertyDto` (tipo plano, sin Domain).
 * Los timestamps de Firestore se convierten a string ISO.
 */
function documentoAPropertyDto(snap: { id: string; data(): unknown }): PropertyDto {
  const data = snap.data() as PropertyDto;

  return {
    id: snap.id,
    codigo: String(data.codigo ?? ''),
    slug: String(data.slug ?? ''),
    status: (data.status ?? 'HIDDEN') as EstadoPropiedad,
    operacion: data.operacion as import('@jf/shared-types').Operacion,
    tipo: data.tipo as import('@jf/shared-types').TipoInmueble,
    titulo: {
      es: String((data.titulo as { es?: string })?.es ?? ''),
      en: (data.titulo as { en?: string })?.en,
    },
    descripcion: data.descripcion
      ? {
          es: String((data.descripcion as { es?: string }).es),
          en: (data.descripcion as { en?: string }).en,
        }
      : undefined,
    precio: Number(data.precio ?? 0),
    departamento: String(data.departamento ?? ''),
    municipio: String(data.municipio ?? ''),
    createdAt: data.createdAt ? toISO(data.createdAt) : new Date().toISOString(),
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : new Date().toISOString(),
    fechaPublicacion: data.fechaPublicacion
      ? toISO(data.fechaPublicacion)
      : undefined,
    destacada: !!data.destacada,
    estrato: data.estrato,
    predial: data.predial,
    administracion: data.administracion,
    acabados: data.acabados,
    antiguedad: data.antiguedad,
    areaConstruida: data.areaConstruida,
    areaLote: data.areaLote,
    dormitorios: data.dormitorios,
    banos: data.banos,
    parqueaderos: data.parqueaderos,
    deposito: data.deposito,
    amenidades: data.amenidades,
    fotos: data.fotos,
    videos: data.videos,
    panoramas: data.panoramas,
    proyecto: data.proyecto,
  };
}

/** Convierte un valor de timestamp de Firestore a string ISO. */
function toISO(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(value as number).toISOString();
}

/** Extrae los campos de portada (posición 1) para la tarjeta. */
function extraerPortada(fotos?: unknown[]): PropertyCardDto['portada'] {
  if (!fotos || fotos.length === 0) return undefined;
  const primera = fotos[0] as { derivados?: unknown };
  if (!primera?.derivados) return undefined;
  return primera.derivados as unknown as PropertyCardDto['portada'];
}

/**
 * Adaptador Firestore de `PropertiesRepository`.
 *
 * Genera el código secuencial `JF-XXXX` mediante un contador atómico en
 * `counters/property` (D6, AC1.7.1).
 *
 * No importa Domain: devuelve DTOs planos. Application se encarga de
 * convertirlos a entidades si necesita reglas de dominio.
 */
export function createFirestorePropertiesRepository(
  db: Firestore,
): PropertiesRepository {
  const propiedades = db.collection('properties');

  async function generarCodigoSecuencial(): Promise<string> {
    const contadorRef = db.doc(`${CODIGOS_SECUENCIALES}/${DOC_CODIGO_PROPIEDAD}`);

    const siguiente = await db.runTransaction(async (tx) => {
      const snap = await tx.get(contadorRef);
      const actual = snap.exists
        ? ((snap.data() as { secuencial: number }).secuencial ?? 0)
        : 0;
      const nuevo = actual + 1;
      tx.set(contadorRef, { secuencial: nuevo }, { merge: true });
      return nuevo;
    });

    return `JF-${String(siguiente).padStart(4, '0')}`;
  }

  async function crear(
    input: CrearPropertyInputDto,
  ): Promise<CrearPropertyResult> {
    const id = crypto.randomUUID();
    const codigo = await generarCodigoSecuencial();
    const ahora = new Date().toISOString();
    const slug = `${slugify(input.titulo.es)}-${codigo}`;

    await db.doc(`properties/${id}`).set({
      codigo,
      slug,
      status: 'HIDDEN',
      operacion: input.operacion,
      tipo: input.tipo,
      titulo: input.titulo,
      descripcion: input.descripcion,
      precio: input.precio,
      departamento: input.departamento,
      municipio: input.municipio,
      createdAt: ahora,
      updatedAt: ahora,
      ...(input.estrato !== undefined && { estrato: input.estrato }),
      ...(input.predial !== undefined && { predial: input.predial }),
      ...(input.administracion !== undefined && {
        administracion: input.administracion,
      }),
      ...(input.acabados !== undefined && { acabados: input.acabados }),
      ...(input.antiguedad !== undefined && { antiguedad: input.antiguedad }),
      ...(input.areaConstruida !== undefined && {
        areaConstruida: input.areaConstruida,
      }),
      ...(input.areaLote !== undefined && { areaLote: input.areaLote }),
      ...(input.dormitorios !== undefined && { dormitorios: input.dormitorios }),
      ...(input.banos !== undefined && { banos: input.banos }),
      ...(input.parqueaderos !== undefined && {
        parqueaderos: input.parqueaderos,
      }),
      ...(input.deposito !== undefined && { deposito: input.deposito }),
      ...(input.amenidades !== undefined && { amenidades: input.amenidades }),
      ...(input.puntosInteres !== undefined && {
        puntosInteres: input.puntosInteres,
      }),
      ...(input.fotos !== undefined && { fotos: input.fotos }),
      ...(input.videos !== undefined && { videos: input.videos }),
      ...(input.panoramas !== undefined && { panoramas: input.panoramas }),
      ...(input.destacada !== undefined && { destacada: input.destacada }),
      ...(input.proyecto !== undefined && { proyecto: input.proyecto }),
    });

    const property = {
      id,
      codigo,
      slug,
      status: 'HIDDEN' as EstadoPropiedad,
      operacion: input.operacion,
      tipo: input.tipo,
      titulo: input.titulo,
      descripcion: input.descripcion,
      precio: input.precio,
      departamento: input.departamento,
      municipio: input.municipio,
      createdAt: ahora,
      updatedAt: ahora,
      destacada: input.destacada ?? false,
      estrato: input.estrato,
      predial: input.predial,
      administracion: input.administracion,
      acabados: input.acabados,
      antiguedad: input.antiguedad,
      areaConstruida: input.areaConstruida,
      areaLote: input.areaLote,
      dormitorios: input.dormitorios,
      banos: input.banos,
      parqueaderos: input.parqueaderos,
      deposito: input.deposito,
      amenidades: input.amenidades,
      puntosInteres: input.puntosInteres,
      fotos: input.fotos,
      videos: input.videos,
      panoramas: input.panoramas,
      proyecto: input.proyecto,
    };

    return { property };
  }

  async function findByIdOrSlug(
    idOrSlug: string,
    esPublico: boolean,
  ): Promise<ObtenerPropertyResult | null> {
    // 1) Intentar por ID de documento
    const porIdSnap = await db.doc(`properties/${idOrSlug}`).get();
    if (porIdSnap.exists) {
      const property = documentoAPropertyDto(porIdSnap);
      if (esPublico && property.status !== 'ACTIVE') return null;
      return { property, esPublico };
    }

    // 2) Intentar por slug
    const porSlugSnap = await propiedades
      .where('slug', '==', idOrSlug)
      .limit(1)
      .get();
    if (porSlugSnap.empty) {
      return null;
    }
    const property = documentoAPropertyDto(porSlugSnap.docs[0]);
    if (esPublico && property.status !== 'ACTIVE') return null;
    return { property, esPublico };
  }

  async function listPublico(
    filtros: FiltrosListadoPublico,
  ): Promise<ListadoPublicoResult> {
    let consulta = propiedades
      .where('status', '==', 'ACTIVE')
      .where('operacion', '==', filtros.operacion)
      .where('destacada', '==', filtros.destacada)
      .orderBy('createdAt', 'desc')
      .orderBy('__name__', 'desc');

    if (filtros.tipo) {
      consulta = consulta.where('tipo', '==', filtros.tipo);
    }

    if (filtros.departamento && filtros.municipio) {
      consulta = consulta.where('departamento', '==', filtros.departamento);
      consulta = consulta.where('municipio', '==', filtros.municipio);
    }

    if (filtros.precioMin !== undefined) {
      consulta = consulta.where('precio', '>=', filtros.precioMin);
    }

    if (filtros.precioMax !== undefined) {
      consulta = consulta.where('precio', '<=', filtros.precioMax);
    }

    consulta = consulta.limit(filtros.limit ?? 12);

    if (filtros.cursor) {
      const cursorData = JSON.parse(
        Buffer.from(filtros.cursor, 'base64').toString('utf-8'),
      );
      consulta = consulta.startAfter(cursorData.createdAt, cursorData.id);
    }

    const snap = await consulta.get();

    const items: PropertyCardDto[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        id: docSnap.id,
        codigo: String(data.codigo ?? ''),
        slug: String(data.slug ?? ''),
        operacion: data.operacion as import('@jf/shared-types').Operacion,
        tipo: data.tipo as import('@jf/shared-types').TipoInmueble,
        titulo: {
          es: String((data.titulo as { es?: string })?.es ?? ''),
          en: (data.titulo as { en?: string })?.en,
        },
        precio: Number(data.precio ?? 0),
        departamento: String(data.departamento ?? ''),
        municipio: String(data.municipio ?? ''),
        portada: extraerPortada(data.fotos as unknown[]),
        destacada: !!data.destacada,
        createdAt: data.createdAt ? toISO(data.createdAt) : '',
      };
    });

    let nextCursor: string | undefined;
    if (snap.docs.length === (filtros.limit ?? 12)) {
      const ultimo = snap.docs[snap.docs.length - 1];
      const ultimoData = ultimo.data() as Record<string, unknown>;
      const cursorObj = {
        createdAt: ultimoData.createdAt ? toISO(ultimoData.createdAt) : '',
        id: ultimo.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    return { items, nextCursor };
  }

  async function getFeatured(): Promise<readonly PropertyCardDto[]> {
    const snap = await propiedades
      .where('status', '==', 'ACTIVE')
      .where('destacada', '==', true)
      .orderBy('fechaPublicacion', 'desc')
      .orderBy('__name__', 'asc')
      .limit(12)
      .get();

    return snap.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        id: docSnap.id,
        codigo: String(data.codigo ?? ''),
        slug: String(data.slug ?? ''),
        operacion: data.operacion as import('@jf/shared-types').Operacion,
        tipo: data.tipo as import('@jf/shared-types').TipoInmueble,
        titulo: {
          es: String((data.titulo as { es?: string })?.es ?? ''),
          en: (data.titulo as { en?: string })?.en,
        },
        precio: Number(data.precio ?? 0),
        departamento: String(data.departamento ?? ''),
        municipio: String(data.municipio ?? ''),
        portada: extraerPortada(data.fotos as unknown[]),
        destacada: true,
        createdAt: data.createdAt ? toISO(data.createdAt) : '',
      };
    });
  }

  async function update(
    idOrSlug: string,
    input: ActualizarPropertyInputDto,
  ): Promise<{ property: PropertyDto }> {
    // Buscar el documento existente
    const snap = await db.doc(`properties/${idOrSlug}`).get();
    let docRef = db.doc(`properties/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await propiedades
        .where('slug', '==', idOrSlug)
        .limit(1)
        .get();
      if (porSlugSnap.empty) {
        throw new Error(errPropertyNotFound(idOrSlug));
      }
      docRef = porSlugSnap.docs[0].ref;
    }

    const ahora = new Date().toISOString();
    const actualizaciones: Record<string, unknown> = { updatedAt: ahora };

    if (input.operacion !== undefined) actualizaciones.operacion = input.operacion;
    if (input.tipo !== undefined) actualizaciones.tipo = input.tipo;
    if (input.titulo !== undefined) actualizaciones.titulo = input.titulo;
    if (input.descripcion !== undefined)
      actualizaciones.descripcion = input.descripcion;
    if (input.precio !== undefined) actualizaciones.precio = input.precio;
    if (input.departamento !== undefined)
      actualizaciones.departamento = input.departamento;
    if (input.municipio !== undefined)
      actualizaciones.municipio = input.municipio;
    if (input.estrato !== undefined) actualizaciones.estrato = input.estrato;
    if (input.predial !== undefined) actualizaciones.predial = input.predial;
    if (input.administracion !== undefined)
      actualizaciones.administracion = input.administracion;
    if (input.acabados !== undefined) actualizaciones.acabados = input.acabados;
    if (input.antiguedad !== undefined)
      actualizaciones.antiguedad = input.antiguedad;
    if (input.areaConstruida !== undefined)
      actualizaciones.areaConstruida = input.areaConstruida;
    if (input.areaLote !== undefined) actualizaciones.areaLote = input.areaLote;
    if (input.dormitorios !== undefined)
      actualizaciones.dormitorios = input.dormitorios;
    if (input.banos !== undefined) actualizaciones.banos = input.banos;
    if (input.parqueaderos !== undefined)
      actualizaciones.parqueaderos = input.parqueaderos;
    if (input.deposito !== undefined) actualizaciones.deposito = input.deposito;
    if (input.amenidades !== undefined)
      actualizaciones.amenidades = input.amenidades;
    if (input.puntosInteres !== undefined)
      actualizaciones.puntosInteres = input.puntosInteres;
    if (input.fotos !== undefined) actualizaciones.fotos = input.fotos;
    if (input.videos !== undefined) actualizaciones.videos = input.videos;
    if (input.panoramas !== undefined)
      actualizaciones.panoramas = input.panoramas;
    if (input.destacada !== undefined) actualizaciones.destacada = input.destacada;
    if (input.proyecto !== undefined) actualizaciones.proyecto = input.proyecto;

    await docRef.update(actualizaciones);

    const snapActualizado = await docRef.get();
    const property = documentoAPropertyDto(snapActualizado);

    return { property };
  }

  async function activate(idOrSlug: string): Promise<ActivarPropertyResult> {
    await cambiarEstado(idOrSlug, 'ACTIVE');

    const snap = await db.doc(`properties/${idOrSlug}`).get();
    if (!snap.exists) {
      throw new Error(errPropertyNotFound(idOrSlug));
    }

    const property = documentoAPropertyDto(snap);

    return {
      property,
      primeraActivacion: property.fechaPublicacion !== undefined,
      fechaPublicacion:
        property.fechaPublicacion ?? new Date().toISOString(),
    };
  }

  async function hide(idOrSlug: string): Promise<OcultarPropertyResult> {
    await cambiarEstado(idOrSlug, 'HIDDEN');

    const snap = await db.doc(`properties/${idOrSlug}`).get();
    if (!snap.exists) {
      throw new Error(errPropertyNotFound(idOrSlug));
    }

    const property = documentoAPropertyDto(snap);

    return { property };
  }

  async function softDelete(idOrSlug: string): Promise<EliminarPropertyResult> {
    await cambiarEstado(idOrSlug, 'DELETED');

    const snap = await db.doc(`properties/${idOrSlug}`).get();
    if (!snap.exists) {
      throw new Error(errPropertyNotFound(idOrSlug));
    }

    const property = documentoAPropertyDto(snap);

    return { property };
  }

  async function cambiarEstado(
    idOrSlug: string,
    estado: EstadoPropiedad,
  ): Promise<void> {
    // Resolver referencia (por id o por slug)
    const snap = await db.doc(`properties/${idOrSlug}`).get();
    let docRef = db.doc(`properties/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await propiedades
        .where('slug', '==', idOrSlug)
        .limit(1)
        .get();
      if (porSlugSnap.empty) {
        throw new Error(errPropertyNotFound(idOrSlug));
      }
      docRef = porSlugSnap.docs[0].ref;
    }

    await docRef.update({
      status: estado,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    create: crear,
    findByIdOrSlug,
    listPublico,
    getFeatured,
    update,
    activate,
    hide,
    softDelete,
  };
}

/** Genera un slug a partir de texto: minúsculas, solo alfanuméricos y guiones. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
