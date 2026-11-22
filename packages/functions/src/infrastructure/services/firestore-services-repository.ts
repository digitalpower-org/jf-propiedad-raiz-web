// Adaptador Firestore de `ServiciosRepository` (MT4.2).

import type { Firestore, WriteBatch } from 'firebase-admin/firestore';
import { z } from 'zod';

import type {
  ServiciosRepository,
  ServiceDto,
  ServiceCardDto,
  ListarPaginadoResult,
  FiltrosListadoServicios,
  CrearServiceInputDto,
  ActualizarServiceInputDto,
  CrearServiceResult,
  ActualizarServiceResult,
  ObtenerPorIdOSlugResult,
  TranslatableInputDto,
} from '../../application/ports/services-repository';
import type { EstadoPropiedad, Foto, Translatable } from '@jf/shared-types';

import { errServiceNotFound } from '../../domain/errors/error-messages';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

const COLECCION_SERVICIOS = 'services';
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

const FotoSchema = z.object({
  derivados: z
    .array(
      z.object({
        clave: z.string().min(1),
        ancho: z.number().int().positive(),
        alto: z.number().int().positive(),
      }),
    )
    .nonempty(),
});

const FotosSchema = z.array(FotoSchema).optional();

function validarFotos(fotos?: unknown): void {
  FotosSchema.parse(fotos);
}

/**
 * Mapea un campo traducible del documento a Translatable preservando
 * autoTranslate y enPendiente. Si enPendiente no está almacenado, lo computa:
 * enPendiente = autoTranslate === true && !en
 */
function mapTranslatable(data: unknown): Translatable {
  const d = data as Record<string, unknown> | undefined;
  if (!d) return { es: '' };
  const autoTranslate = d.autoTranslate as boolean | undefined;
  const en = d.en as string | undefined;
  const storedEnPendiente = d.enPendiente as boolean | undefined;
  return {
    es: String(d.es ?? ''),
    en,
    autoTranslate,
    enPendiente: storedEnPendiente ?? (autoTranslate === true && !en),
  };
}

/**
 * Mapea un documento de Firestore a un `ServiceDto` (tipo plano, sin Domain).
 * Los timestamps de Firestore se convierten a string ISO.
 * Preserva autoTranslate y enPendiente en todos los campos traducibles.
 */
function documentoAServiceDto(snap: { id: string; data(): unknown }): ServiceDto {
  const data = snap.data() as Record<string, unknown>;

  return {
    id: snap.id,
    slug: String(data.slug ?? ''),
    status: (data.status ?? 'HIDDEN') as EstadoPropiedad,
    titulo: mapTranslatable(data.titulo),
    resumen: mapTranslatable(data.resumen),
    cuerpo: mapTranslatable(data.cuerpo),
    orden: Number(data.orden ?? 0),
    fotos: data.fotos as readonly Foto[] | undefined,
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : new Date().toISOString(),
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

/** Extrae los campos de portada (posición 0) para la tarjeta. */
function extraerPortada(fotos?: readonly Foto[]): ServiceCardDto['portada'] {
  if (!fotos || fotos.length === 0) return undefined;
  const primera = fotos[0];
  if (!primera?.derivados) return undefined;
  return primera.derivados.map((d) => ({ clave: d.clave, ancho: d.ancho }));
}

/** Convierte TranslatableInputDto a objeto plano para Firestore. */
function toFirestoreTranslatable(input: TranslatableInputDto): Record<string, unknown> {
  const result: Record<string, unknown> = { es: input.es };
  if (input.en !== undefined) result.en = input.en;
  if (input.autoTranslate !== undefined) result.autoTranslate = input.autoTranslate;
  return result;
}

/** Genera un slug a partir de texto: minúsculas, solo alfanuméricos y guiones. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Codifica el cursor a base64: { orden, id }. */
function encodeCursor(orden: number, id: string): string {
  return Buffer.from(JSON.stringify({ orden, id })).toString('base64');
}

/** Decodifica el cursor desde base64, valida forma { orden, id }. */
function decodeCursor(cursor: string): { orden: number; id: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    throw new ApiError(errorCode.validationError, 'Cursor inválido');
  }
  const obj = parsed as Record<string, unknown>;
  const orden = Number(obj.orden);
  const id = String(obj.id ?? '');
  if (!Number.isFinite(orden) || !id) {
    throw new ApiError(errorCode.validationError, 'Cursor inválido');
  }
  return { orden, id };
}

export function createFirestoreServicesRepository(db: Firestore): ServiciosRepository {
  const servicios = db.collection(COLECCION_SERVICIOS);

  async function crear(input: CrearServiceInputDto): Promise<CrearServiceResult> {
    const id = crypto.randomUUID();
    const ahora = new Date().toISOString();
    const slug = slugify(input.titulo.es);

    validarFotos(input.fotos);

    const orden = input.orden ?? 0;

    await db.doc(`${COLECCION_SERVICIOS}/${id}`).set({
      slug,
      status: 'HIDDEN',
      titulo: toFirestoreTranslatable(input.titulo),
      resumen: toFirestoreTranslatable(input.resumen),
      cuerpo: toFirestoreTranslatable(input.cuerpo),
      orden,
      ...(input.fotos !== undefined && { fotos: input.fotos }),
      updatedAt: ahora,
    });

    const service: ServiceDto = {
      id,
      slug,
      status: 'HIDDEN',
      titulo: {
        es: input.titulo.es,
        en: input.titulo.en,
        autoTranslate: input.titulo.autoTranslate,
        enPendiente: input.titulo.autoTranslate === true && !input.titulo.en,
      },
      resumen: {
        es: input.resumen.es,
        en: input.resumen.en,
        autoTranslate: input.resumen.autoTranslate,
        enPendiente: input.resumen.autoTranslate === true && !input.resumen.en,
      },
      cuerpo: {
        es: input.cuerpo.es,
        en: input.cuerpo.en,
        autoTranslate: input.cuerpo.autoTranslate,
        enPendiente: input.cuerpo.autoTranslate === true && !input.cuerpo.en,
      },
      orden,
      fotos: input.fotos,
      updatedAt: ahora,
    };

    return { service };
  }

  async function actualizar(
    idOrSlug: string,
    input: ActualizarServiceInputDto,
  ): Promise<ActualizarServiceResult> {
    // Buscar el documento existente
    const snap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    let docRef = db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new Error(errServiceNotFound(idOrSlug));
      }
      docRef = porSlugSnap.docs[0].ref;
    }

    const ahora = new Date().toISOString();

    validarFotos(input.fotos);

    const actualizaciones: Record<string, unknown> = { updatedAt: ahora };

    if (input.titulo !== undefined) actualizaciones.titulo = toFirestoreTranslatable(input.titulo);
    if (input.resumen !== undefined)
      actualizaciones.resumen = toFirestoreTranslatable(input.resumen);
    if (input.cuerpo !== undefined) actualizaciones.cuerpo = toFirestoreTranslatable(input.cuerpo);
    if (input.fotos !== undefined) actualizaciones.fotos = input.fotos;
    if (input.orden !== undefined) actualizaciones.orden = input.orden;
    if (input.status !== undefined) actualizaciones.status = input.status;

    await docRef.update(actualizaciones);

    const snapActualizado = await docRef.get();
    const service = documentoAServiceDto(snapActualizado);

    return { service };
  }

  async function eliminar(idOrSlug: string): Promise<{ service: ServiceDto }> {
    await cambiarEstado(idOrSlug, 'DELETED');

    const snap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    if (!snap.exists) {
      const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new Error(errServiceNotFound(idOrSlug));
      }
      return { service: documentoAServiceDto(porSlugSnap.docs[0]) };
    }

    return { service: documentoAServiceDto(snap) };
  }

  async function activar(idOrSlug: string): Promise<{ service: ServiceDto }> {
    await cambiarEstado(idOrSlug, 'ACTIVE');

    const snap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    if (!snap.exists) {
      const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new Error(errServiceNotFound(idOrSlug));
      }
      return { service: documentoAServiceDto(porSlugSnap.docs[0]) };
    }

    return { service: documentoAServiceDto(snap) };
  }

  async function ocultar(idOrSlug: string): Promise<{ service: ServiceDto }> {
    await cambiarEstado(idOrSlug, 'HIDDEN');

    const snap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    if (!snap.exists) {
      const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new Error(errServiceNotFound(idOrSlug));
      }
      return { service: documentoAServiceDto(porSlugSnap.docs[0]) };
    }

    return { service: documentoAServiceDto(snap) };
  }

  async function reordenar(items: readonly { id: string; orden: number }[]): Promise<void> {
    const batch = db.batch() as WriteBatch;

    for (const item of items) {
      const docRef = db.doc(`${COLECCION_SERVICIOS}/${item.id}`);
      batch.update(docRef, {
        orden: item.orden,
        updatedAt: new Date().toISOString(),
      });
    }

    await batch.commit();
  }

  async function obtenerPorIdOSlug(
    idOrSlug: string,
    esPublico: boolean,
    includeHidden?: boolean,
  ): Promise<ObtenerPorIdOSlugResult | null> {
    // 1) Intentar por ID de documento
    const porIdSnap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    if (porIdSnap.exists) {
      const service = documentoAServiceDto(porIdSnap);
      if (esPublico && service.status === 'DELETED') return null;
      if (esPublico && service.status === 'HIDDEN' && includeHidden !== true) return null;
      return { service, esPublico };
    }

    // 2) Intentar por slug
    const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
    if (porSlugSnap.empty) {
      return null;
    }
    const service = documentoAServiceDto(porSlugSnap.docs[0]);
    if (esPublico && service.status === 'DELETED') return null;
    if (esPublico && service.status === 'HIDDEN' && includeHidden !== true) return null;
    return { service, esPublico };
  }

  async function listarPaginado(
    filtros: FiltrosListadoServicios = {},
  ): Promise<ListarPaginadoResult> {
    const { cursor, limit, includeHidden } = filtros;
    const lim = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    let consulta = servicios.orderBy('orden', 'asc').orderBy('__name__', 'asc').limit(lim);

    if (includeHidden !== true) {
      consulta = consulta.where('status', '==', 'ACTIVE');
    } else {
      consulta = consulta.where('status', 'in', ['ACTIVE', 'HIDDEN']);
    }

    if (cursor) {
      const { orden, id } = decodeCursor(cursor);
      consulta = consulta.startAfter(orden, id);
    }

    const snap = await consulta.get();

    const items: ServiceCardDto[] = snap.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return {
        id: docSnap.id,
        slug: String(data.slug ?? ''),
        titulo: {
          es: String((data.titulo as { es?: string })?.es ?? ''),
          en: (data.titulo as { en?: string })?.en,
        },
        resumen: {
          es: String((data.resumen as { es?: string })?.es ?? ''),
          en: (data.resumen as { en?: string })?.en,
        },
        orden: Number(data.orden ?? 0),
        portada: extraerPortada(data.fotos as readonly Foto[] | undefined),
      };
    });

    let nextCursor: string | undefined;
    if (snap.docs.length === lim) {
      const ultimo = snap.docs[snap.docs.length - 1];
      const ultimoData = ultimo.data() as Record<string, unknown>;
      const orden = Number(ultimoData.orden ?? 0);
      nextCursor = encodeCursor(orden, ultimo.id);
    }

    return { items, nextCursor };
  }

  async function cambiarEstado(idOrSlug: string, estado: EstadoPropiedad): Promise<void> {
    // Resolver referencia (por id o por slug)
    const snap = await db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`).get();
    let docRef = db.doc(`${COLECCION_SERVICIOS}/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await servicios.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new Error(errServiceNotFound(idOrSlug));
      }
      docRef = porSlugSnap.docs[0].ref;
    }

    await docRef.update({
      status: estado,
      updatedAt: new Date().toISOString(),
    });
  }

  return {
    crear,
    actualizar,
    eliminar,
    activar,
    ocultar,
    reordenar,
    obtenerPorIdOSlug,
    listarPaginado,
  };
}
