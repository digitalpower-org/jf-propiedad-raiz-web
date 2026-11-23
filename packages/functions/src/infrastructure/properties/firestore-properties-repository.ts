import type { Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

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
  TranslatableInputDto,
} from '../../application/ports/properties-repository';
import type { EstadoPropiedad, PuntoInteres, Translatable } from '@jf/shared-types';

import { errPropertyNotFound } from '../../domain/errors/error-messages';
import { errorCode } from '../../domain/errors/errorCatalog';
import { ApiError } from '../../domain/errors/api-error';

const CODIGOS_SECUENCIALES = 'counters';
const DOC_CODIGO_PROPIEDAD = 'property';

const MedioSchema = z.object({
  derivados: z
    .array(
      z.object({
        clave: z.string().min(1),
        ancho: z.number().int().positive(),
      }),
    )
    .nonempty(),
});

const MediosSchema = z.object({
  fotos: z.array(MedioSchema).optional(),
  videos: z.array(z.string()).optional(),
  panoramas: z.array(MedioSchema).optional(),
});

function validarMedios(input: { fotos?: unknown; videos?: unknown; panoramas?: unknown }): void {
  MediosSchema.parse(input);
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
 * Mapea un array de puntos de interés preservando la estructura completa.
 */
function mapPuntosInteres(data: unknown): readonly PuntoInteres[] | undefined {
  if (!Array.isArray(data)) return undefined;
  return data.map((p) => {
    const pi = p as Record<string, unknown>;
    return {
      categoria: pi.categoria as import('@jf/shared-types').PuntoInteresCategoria | undefined,
      etiqueta: mapTranslatable(pi.etiqueta),
    };
  }) as readonly PuntoInteres[];
}

/**
 * Mapea un documento de Firestore a un `PropertyDto` (tipo plano, sin Domain).
 * Los timestamps de Firestore se convierten a string ISO.
 * Preserva autoTranslate y enPendiente en todos los campos traducibles.
 */
function documentoAPropertyDto(snap: { id: string; data(): unknown }): PropertyDto {
  const data = snap.data() as Record<string, unknown>;
  const proyecto = data.proyecto as
    | {
        etapa?: unknown;
        fechaEntregaEstimada?: unknown;
        unidadesDisponibles?: unknown;
      }
    | undefined;

  return {
    id: snap.id,
    codigo: String(data.codigo ?? ''),
    slug: String(data.slug ?? ''),
    status: (data.status ?? 'HIDDEN') as EstadoPropiedad,
    operacion: data.operacion as import('@jf/shared-types').Operacion,
    tipo: data.tipo as import('@jf/shared-types').TipoInmueble,
    titulo: mapTranslatable(data.titulo),
    descripcion: data.descripcion ? mapTranslatable(data.descripcion) : undefined,
    precio: Number(data.precio ?? 0),
    departamento: String(data.departamento ?? ''),
    municipio: String(data.municipio ?? ''),
    createdAt: data.createdAt ? toISO(data.createdAt) : new Date().toISOString(),
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : new Date().toISOString(),
    fechaPublicacion: data.fechaPublicacion ? toISO(data.fechaPublicacion) : undefined,
    destacada: !!data.destacada,
    estrato: data.estrato as number | undefined,
    predial: data.predial as string | undefined,
    administracion: data.administracion as string | undefined,
    acabados: data.acabados ? mapTranslatable(data.acabados) : undefined,
    antiguedad: data.antiguedad as string | undefined,
    areaConstruida: data.areaConstruida as number | undefined,
    areaLote: data.areaLote as number | undefined,
    dormitorios: data.dormitorios as number | undefined,
    banos: data.banos as number | undefined,
    parqueaderos: data.parqueaderos as number | undefined,
    deposito: data.deposito as number | undefined,
    amenidades: data.amenidades as readonly string[] | undefined,
    puntosInteres: mapPuntosInteres(data.puntosInteres),
    fotos: data.fotos as readonly import('@jf/shared-types').Foto[] | undefined,
    videos: data.videos as readonly import('@jf/shared-types').VideoYouTube[] | undefined,
    panoramas: data.panoramas as readonly import('@jf/shared-types').Panorama[] | undefined,
    proyecto: proyecto
      ? {
          etapa: proyecto.etapa ? mapTranslatable(proyecto.etapa) : undefined,
          fechaEntregaEstimada: proyecto.fechaEntregaEstimada as string | undefined,
          unidadesDisponibles: proyecto.unidadesDisponibles as number | undefined,
        }
      : undefined,
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
export function createFirestorePropertiesRepository(db: Firestore): PropertiesRepository {
  const propiedades = db.collection('properties');

  async function generarCodigoSecuencial(): Promise<string> {
    const contadorRef = db.doc(`${CODIGOS_SECUENCIALES}/${DOC_CODIGO_PROPIEDAD}`);

    const siguiente = await db.runTransaction(async (tx) => {
      const snap = await tx.get(contadorRef);
      const actual = snap.exists ? ((snap.data() as { secuencial: number }).secuencial ?? 0) : 0;
      const nuevo = actual + 1;
      tx.set(contadorRef, { secuencial: nuevo }, { merge: true });
      return nuevo;
    });

    return `JF-${String(siguiente).padStart(4, '0')}`;
  }

  /** Convierte TranslatableInputDto a objeto plano para Firestore. */
  function toFirestoreTranslatable(input: TranslatableInputDto): Record<string, unknown> {
    const result: Record<string, unknown> = { es: input.es };
    if (input.en !== undefined) result.en = input.en;
    if (input.autoTranslate !== undefined) result.autoTranslate = input.autoTranslate;
    return result;
  }

  async function crear(input: CrearPropertyInputDto): Promise<CrearPropertyResult> {
    const id = crypto.randomUUID();
    const codigo = await generarCodigoSecuencial();
    const ahora = new Date().toISOString();
    const slug = `${slugify(input.titulo.es)}-${codigo}`;

    validarMedios({
      fotos: input.fotos,
      videos: input.videos,
      panoramas: input.panoramas,
    });

    await db.doc(`properties/${id}`).set({
      codigo,
      slug,
      status: 'HIDDEN',
      operacion: input.operacion,
      tipo: input.tipo,
      titulo: toFirestoreTranslatable(input.titulo),
      ...(input.descripcion !== undefined && {
        descripcion: toFirestoreTranslatable(input.descripcion),
      }),
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
      ...(input.acabados !== undefined && { acabados: toFirestoreTranslatable(input.acabados) }),
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
        puntosInteres: input.puntosInteres
          ? input.puntosInteres.map((pi) => ({
              categoria: pi.categoria,
              etiqueta: {
                es: pi.etiqueta!.es,
                en: pi.etiqueta!.en,
                autoTranslate: pi.etiqueta!.autoTranslate,
                enPendiente: pi.etiqueta!.autoTranslate === true && !pi.etiqueta!.en,
              },
            }))
          : undefined,
      }),
      ...(input.fotos !== undefined && { fotos: input.fotos }),
      ...(input.videos !== undefined && { videos: input.videos }),
      ...(input.panoramas !== undefined && { panoramas: input.panoramas }),
      ...(input.destacada !== undefined && { destacada: input.destacada }),
      ...(input.proyecto !== undefined && {
        proyecto: {
          ...(input.proyecto.etapa !== undefined
            ? { etapa: toFirestoreTranslatable(input.proyecto.etapa) }
            : {}),
          ...(input.proyecto.fechaEntregaEstimada !== undefined
            ? { fechaEntregaEstimada: input.proyecto.fechaEntregaEstimada }
            : {}),
          ...(input.proyecto.unidadesDisponibles !== undefined
            ? { unidadesDisponibles: input.proyecto.unidadesDisponibles }
            : {}),
        },
      }),
    });

    const property: PropertyDto = {
      id,
      codigo,
      slug,
      status: 'HIDDEN' as EstadoPropiedad,
      operacion: input.operacion,
      tipo: input.tipo,
      titulo: {
        es: input.titulo.es,
        en: input.titulo.en,
        autoTranslate: input.titulo.autoTranslate,
        enPendiente: input.titulo.autoTranslate === true && !input.titulo.en,
      },
      descripcion: input.descripcion
        ? {
            es: input.descripcion.es,
            en: input.descripcion.en,
            autoTranslate: input.descripcion.autoTranslate,
            enPendiente: input.descripcion.autoTranslate === true && !input.descripcion.en,
          }
        : undefined,
      precio: input.precio,
      departamento: input.departamento,
      municipio: input.municipio,
      createdAt: ahora,
      updatedAt: ahora,
      destacada: input.destacada ?? false,
      estrato: input.estrato,
      predial: input.predial,
      administracion: input.administracion,
      acabados: input.acabados
        ? {
            es: input.acabados.es,
            en: input.acabados.en,
            autoTranslate: input.acabados.autoTranslate,
            enPendiente: input.acabados.autoTranslate === true && !input.acabados.en,
          }
        : undefined,
      antiguedad: input.antiguedad,
      areaConstruida: input.areaConstruida,
      areaLote: input.areaLote,
      dormitorios: input.dormitorios,
      banos: input.banos,
      parqueaderos: input.parqueaderos,
      deposito: input.deposito,
      amenidades: input.amenidades,
      puntosInteres: input.puntosInteres
        ? input.puntosInteres.map((pi) => ({
            categoria: pi.categoria,
            etiqueta: {
              es: pi.etiqueta!.es,
              en: pi.etiqueta!.en,
              autoTranslate: pi.etiqueta!.autoTranslate,
              enPendiente: pi.etiqueta!.autoTranslate === true && !pi.etiqueta!.en,
            },
          }))
        : undefined,
      fotos: input.fotos,
      videos: input.videos,
      panoramas: input.panoramas,
      proyecto: input.proyecto
        ? {
            etapa: input.proyecto.etapa
              ? {
                  es: input.proyecto.etapa.es,
                  en: input.proyecto.etapa.en,
                  autoTranslate: input.proyecto.etapa.autoTranslate,
                  enPendiente:
                    input.proyecto.etapa.autoTranslate === true && !input.proyecto.etapa.en,
                }
              : undefined,
            fechaEntregaEstimada: input.proyecto.fechaEntregaEstimada,
            unidadesDisponibles: input.proyecto.unidadesDisponibles,
          }
        : undefined,
    };

    return { property };
  }

  async function findByIdOrSlug(
    idOrSlug: string,
    esPublico: boolean,
    includeHidden?: boolean,
  ): Promise<ObtenerPropertyResult | null> {
    // 1) Intentar por ID de documento
    const porIdSnap = await db.doc(`properties/${idOrSlug}`).get();
    if (porIdSnap.exists) {
      const property = documentoAPropertyDto(porIdSnap);
      if (esPublico && property.status !== 'ACTIVE' && !includeHidden) return null;
      return { property, esPublico };
    }

    // 2) Intentar por slug
    const porSlugSnap = await propiedades.where('slug', '==', idOrSlug).limit(1).get();
    if (porSlugSnap.empty) {
      return null;
    }
    const property = documentoAPropertyDto(porSlugSnap.docs[0]);
    if (esPublico && property.status !== 'ACTIVE' && !includeHidden) return null;
    return { property, esPublico };
  }

  async function listPublico(filtros: FiltrosListadoPublico): Promise<ListadoPublicoResult> {
    // Todos los filtros where deben ir antes de cualquier orderBy. Cuando hay
    // rango de precio, Firestore exige que el primer orderBy sea sobre precio.
    let consulta = propiedades
      .where('operacion', '==', filtros.operacion)
      .where('destacada', '==', filtros.destacada);

    if (!filtros.includeHidden) {
      consulta = consulta.where('status', '==', 'ACTIVE');
    }

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

    if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
      consulta = consulta.orderBy('precio', 'asc');
    }

    consulta = consulta.orderBy('createdAt', 'desc').orderBy('__name__', 'desc');

    consulta = consulta.limit(filtros.limit ?? 12);

    if (filtros.cursor) {
      const cursorData: { createdAt: unknown; id: string } = JSON.parse(
        Buffer.from(filtros.cursor, 'base64').toString('utf-8'),
      );
      // El payload del cursor es opaco { createdAt, id }. Con precio como primer
      // orderBy, startAfter(createdAt, id) ya no es válido. Se resuelve el
      // documento por id y se pasa el snapshot a startAfter para que Firestore
      // derive todos los valores del cursor. Si el documento ya no existe, se
      // devuelve una pagina vacia sin lanzar.
      const cursorSnap = await db.doc(`properties/${cursorData.id}`).get();
      if (!cursorSnap.exists) {
        return { items: [], nextCursor: undefined };
      }
      consulta = consulta.startAfter(cursorSnap);
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
    expectedUpdatedAt?: string,
  ): Promise<{ property: PropertyDto }> {
    const docRef = db.doc(`properties/${idOrSlug}`);

    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      let targetRef = docRef;
      let datosPrevios = snap.exists ? snap.data() : undefined;

      if (!snap.exists) {
        const porSlugSnap = await propiedades.where('slug', '==', idOrSlug).limit(1).get();
        if (porSlugSnap.empty) {
          throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
        }
        targetRef = porSlugSnap.docs[0].ref;
        const slugSnap = await tx.get(targetRef);
        if (!slugSnap.exists) {
          throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
        }
        datosPrevios = slugSnap.data();
        // Verificar OCC con el documento resuelto por slug
        if (expectedUpdatedAt !== undefined) {
          const storedUpdatedAt = datosPrevios?.updatedAt;
          const storedISO = storedUpdatedAt ? toISO(storedUpdatedAt) : undefined;
          if (storedISO !== expectedUpdatedAt) {
            throw new ApiError(
              errorCode.conflict,
              'El inmueble ha sido modificado por otro usuario. Recarga e inténtalo de nuevo.',
            );
          }
        }
      } else {
        // Verificar OCC con el documento por ID
        if (expectedUpdatedAt !== undefined) {
          const storedUpdatedAt = snap.data()?.updatedAt;
          const storedISO = storedUpdatedAt ? toISO(storedUpdatedAt) : undefined;
          if (storedISO !== expectedUpdatedAt) {
            throw new ApiError(
              errorCode.conflict,
              'El inmueble ha sido modificado por otro usuario. Recarga e inténtalo de nuevo.',
            );
          }
        }
      }

      validarMedios({
        fotos: input.fotos,
        videos: input.videos,
        panoramas: input.panoramas,
      });

      const ahora = new Date().toISOString();

      const actualizaciones: Record<string, unknown> = { updatedAt: ahora };

      if (input.operacion !== undefined) actualizaciones.operacion = input.operacion;
      if (input.tipo !== undefined) actualizaciones.tipo = input.tipo;
      if (input.titulo !== undefined)
        actualizaciones.titulo = toFirestoreTranslatable(input.titulo);
      if (input.descripcion !== undefined)
        actualizaciones.descripcion = toFirestoreTranslatable(input.descripcion);
      if (input.precio !== undefined) actualizaciones.precio = input.precio;
      if (input.departamento !== undefined) actualizaciones.departamento = input.departamento;
      if (input.municipio !== undefined) actualizaciones.municipio = input.municipio;
      if (input.estrato !== undefined) actualizaciones.estrato = input.estrato;
      if (input.predial !== undefined) actualizaciones.predial = input.predial;
      if (input.administracion !== undefined) actualizaciones.administracion = input.administracion;
      if (input.acabados !== undefined)
        actualizaciones.acabados = toFirestoreTranslatable(input.acabados);
      if (input.antiguedad !== undefined) actualizaciones.antiguedad = input.antiguedad;
      if (input.areaConstruida !== undefined) actualizaciones.areaConstruida = input.areaConstruida;
      if (input.areaLote !== undefined) actualizaciones.areaLote = input.areaLote;
      if (input.dormitorios !== undefined) actualizaciones.dormitorios = input.dormitorios;
      if (input.banos !== undefined) actualizaciones.banos = input.banos;
      if (input.parqueaderos !== undefined) actualizaciones.parqueaderos = input.parqueaderos;
      if (input.deposito !== undefined) actualizaciones.deposito = input.deposito;
      if (input.amenidades !== undefined) actualizaciones.amenidades = input.amenidades;
      if (input.puntosInteres !== undefined) actualizaciones.puntosInteres = input.puntosInteres;
      if (input.fotos !== undefined) actualizaciones.fotos = input.fotos;
      if (input.videos !== undefined) actualizaciones.videos = input.videos;
      if (input.panoramas !== undefined) actualizaciones.panoramas = input.panoramas;
      if (input.destacada !== undefined) actualizaciones.destacada = input.destacada;
      if (input.proyecto !== undefined) {
        actualizaciones.proyecto = {
          ...(input.proyecto.etapa !== undefined
            ? { etapa: toFirestoreTranslatable(input.proyecto.etapa) }
            : {}),
          ...(input.proyecto.fechaEntregaEstimada !== undefined
            ? { fechaEntregaEstimada: input.proyecto.fechaEntregaEstimada }
            : {}),
          ...(input.proyecto.unidadesDisponibles !== undefined
            ? { unidadesDisponibles: input.proyecto.unidadesDisponibles }
            : {}),
        };
      }

      tx.update(targetRef, actualizaciones);

      const datosActualizados = { ...(datosPrevios ?? {}), ...actualizaciones };
      const property = documentoAPropertyDto({
        id: targetRef.id,
        data: () => datosActualizados,
      });

      return { property };
    });
  }

  async function activate(idOrSlug: string): Promise<ActivarPropertyResult> {
    // Resolver referencia (por id o por slug)
    const snap = await db.doc(`properties/${idOrSlug}`).get();
    let docRef = db.doc(`properties/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await propiedades.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
      }
      docRef = porSlugSnap.docs[0].ref;
    }

    const currentSnap = await docRef.get();
    const currentProperty = currentSnap.data() as Record<string, unknown> | undefined;
    const currentStatus = currentProperty?.status as EstadoPropiedad | undefined;
    const hasFechaPublicacion = currentProperty?.fechaPublicacion !== undefined;

    const ahora = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status: 'ACTIVE',
      updatedAt: ahora,
    };

    // Solo fijar fechaPublicacion si es la primera activación (venía de HIDDEN y no tiene fechaPublicacion)
    if (currentStatus === 'HIDDEN' && !hasFechaPublicacion) {
      updates.fechaPublicacion = ahora;
    }

    await docRef.update(updates);

    const updatedSnap = await docRef.get();
    const property = documentoAPropertyDto(updatedSnap);

    return {
      property,
      primeraActivacion: !hasFechaPublicacion && currentStatus === 'HIDDEN',
      fechaPublicacion: property.fechaPublicacion ?? ahora,
    };
  }

  async function hide(idOrSlug: string): Promise<OcultarPropertyResult> {
    await cambiarEstado(idOrSlug, 'HIDDEN');

    const snap = await db.doc(`properties/${idOrSlug}`).get();
    if (!snap.exists) {
      throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
    }

    const property = documentoAPropertyDto(snap);

    return { property };
  }

  async function softDelete(idOrSlug: string): Promise<EliminarPropertyResult> {
    await cambiarEstado(idOrSlug, 'DELETED');

    const snap = await db.doc(`properties/${idOrSlug}`).get();
    if (!snap.exists) {
      throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
    }

    const property = documentoAPropertyDto(snap);

    return { property };
  }

  async function cambiarEstado(idOrSlug: string, estado: EstadoPropiedad): Promise<void> {
    // Resolver referencia (por id o por slug)
    const snap = await db.doc(`properties/${idOrSlug}`).get();
    let docRef = db.doc(`properties/${idOrSlug}`);

    if (!snap.exists) {
      const porSlugSnap = await propiedades.where('slug', '==', idOrSlug).limit(1).get();
      if (porSlugSnap.empty) {
        throw new ApiError(errorCode.propertyNotFound, errPropertyNotFound(idOrSlug));
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
