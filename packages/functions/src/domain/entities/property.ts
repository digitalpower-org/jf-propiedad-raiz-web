import type { EstadoPropiedad, Translatable } from '@jf/shared-types';

import { ApiError } from '../errors/api-error';
import {
  ERR_TITLE_REQUIRED,
  ERR_ALREADY_ACTIVE,
  ERR_ALREADY_HIDDEN,
  ERR_ALREADY_DELETED,
  ERR_MISSING_FIELDS_TO_ACTIVATE,
} from '../errors/error-messages';
import type { Operacion } from '../value-objects/operacion';
import type { Precio } from '../value-objects/precio';
import type { TipoPropiedad } from '../value-objects/tipo-propiedad';

/**
 * Campos de entrada para crear un inmueble.
 * Excluye campos de solo lectura del sistema: `id`, `codigo`, `slug`, `status`,
 * `createdAt`, `updatedAt`, `fechaPublicacion`.
 */
export interface CreatePropertyInput {
  readonly operacion: Operacion;
  readonly tipo: TipoPropiedad;
  readonly titulo: Translatable;
  readonly descripcion?: Translatable;
  readonly precio: Precio;
  readonly departamento: string;
  readonly municipio: string;
  readonly estrato?: number;
  readonly predial?: string;
  readonly administracion?: string;
  readonly acabados?: Translatable;
  readonly antiguedad?: string;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly dormitorios?: number;
  readonly banos?: number;
  readonly parqueaderos?: number;
  readonly deposito?: number;
  readonly amenidades?: readonly string[];
  readonly puntosInteres?: readonly unknown[];
  readonly fotos?: readonly unknown[];
  readonly videos?: readonly string[];
  readonly panoramas?: readonly unknown[];
  readonly destacada?: boolean;
  readonly proyecto?: {
    readonly etapa?: Translatable;
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
  };
}

/**
 * Campos de entrada para actualizar un inmueble (edición del admin).
 * Todos opcionales: solo se envían los campos que cambian.
 */
export interface UpdatePropertyInput {
  readonly operacion?: Operacion;
  readonly tipo?: TipoPropiedad;
  readonly titulo?: Translatable;
  readonly descripcion?: Translatable;
  readonly precio?: Precio;
  readonly departamento?: string;
  readonly municipio?: string;
  readonly estrato?: number;
  readonly predial?: string;
  readonly administracion?: string;
  readonly acabados?: Translatable;
  readonly antiguedad?: string;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly dormitorios?: number;
  readonly banos?: number;
  readonly parqueaderos?: number;
  readonly deposito?: number;
  readonly amenidades?: readonly string[];
  readonly puntosInteres?: readonly unknown[];
  readonly fotos?: readonly unknown[];
  readonly videos?: readonly string[];
  readonly panoramas?: readonly unknown[];
  readonly destacada?: boolean;
  readonly proyecto?: {
    readonly etapa?: Translatable;
    readonly fechaEntregaEstimada?: string;
    readonly unidadesDisponibles?: number;
  };
}

/**
 * Estado de activación resuelto por `activate`.
 */
export interface ActivationResult {
  readonly property: Property;
  readonly firstActivation: boolean;
  readonly fechaPublicacion: string;
}

/**
 * Entidad `Property` — reglas de negocio del ciclo de vida del inmueble (US1.7).
 *
 * No conoce Express, HTTP, Firestore ni SDKs. No muta: cada operación devuelve
 * una nueva instancia.
 *
 * El parámetro `now` (opcional, default `new Date()`) permite inyectar tiempo
 * en tests en espera del puerto `Clock` (decisión pendiente, AGENTS.md §7).
 */
export class Property {
  private constructor(
    readonly id: string,
    readonly codigo: string,
    readonly slug: string,
    readonly status: EstadoPropiedad,
    readonly operacion: Operacion,
    readonly tipo: TipoPropiedad,
    readonly titulo: Translatable,
    readonly descripcion: Translatable | undefined,
    readonly precio: Precio,
    readonly departamento: string,
    readonly municipio: string,
    readonly createdAt: string,
    readonly updatedAt: string,
    readonly fechaPublicacion: string | undefined,
    readonly estrato?: number,
    readonly predial?: string,
    readonly administracion?: string,
    readonly acabados?: Translatable,
    readonly antiguedad?: string,
    readonly areaConstruida?: number,
    readonly areaLote?: number,
    readonly dormitorios?: number,
    readonly banos?: number,
    readonly parqueaderos?: number,
    readonly deposito?: number,
    readonly amenidades?: readonly string[],
    readonly puntosInteres?: readonly unknown[],
    readonly fotos?: readonly unknown[],
    readonly videos?: readonly string[],
    readonly panoramas?: readonly unknown[],
    readonly destacada: boolean = false,
    readonly proyecto?: {
      readonly etapa?: Translatable;
      readonly fechaEntregaEstimada?: string;
      readonly unidadesDisponibles?: number;
    },
  ) {}

  /**
   * Crea un inmueble en estado `HIDDEN` con código secuencial y slug generado.
   * El `codigo` (JF-XXXX) y `id` son asignados por el caso de uso/infraestructura
   * (contador atómico de Firestore / id del documento).
   */
  static create(
    input: CreatePropertyInput,
    id: string,
    codigo: string,
    now: Date = new Date(),
  ): Property {
    if (!input.titulo.es || input.titulo.es.trim() === '') {
      throw new ApiError('VALIDATION_ERROR', ERR_TITLE_REQUIRED);
    }

    const slug = slugify(`${input.titulo.es}-${codigo}`);
    const timestamp = now.toISOString();

    return new Property(
      id,
      codigo,
      slug,
      'HIDDEN',
      input.operacion,
      input.tipo,
      input.titulo,
      input.descripcion,
      input.precio,
      input.departamento,
      input.municipio,
      timestamp,
      timestamp,
      undefined,
      input.estrato,
      input.predial,
      input.administracion,
      input.acabados,
      input.antiguedad,
      input.areaConstruida,
      input.areaLote,
      input.dormitorios,
      input.banos,
      input.parqueaderos,
      input.deposito,
      input.amenidades,
      input.puntosInteres,
      input.fotos,
      input.videos,
      input.panoramas,
      input.destacada ?? false,
      input.proyecto,
    );
  }

  /**
   * Actualiza campos editables. Devuelve una nueva instancia con `updatedAt`
   * refrescado para control de concurrencia optimista (AC1.7.8).
   */
  update(input: UpdatePropertyInput, now: Date = new Date()): Property {
    return new Property(
      this.id,
      this.codigo,
      this.slug,
      this.status,
      input.operacion ?? this.operacion,
      input.tipo ?? this.tipo,
      input.titulo ?? this.titulo,
      input.descripcion ?? this.descripcion,
      input.precio ?? this.precio,
      input.departamento ?? this.departamento,
      input.municipio ?? this.municipio,
      this.createdAt,
      now.toISOString(),
      this.fechaPublicacion,
      input.estrato ?? this.estrato,
      input.predial ?? this.predial,
      input.administracion ?? this.administracion,
      input.acabados ?? this.acabados,
      input.antiguedad ?? this.antiguedad,
      input.areaConstruida ?? this.areaConstruida,
      input.areaLote ?? this.areaLote,
      input.dormitorios ?? this.dormitorios,
      input.banos ?? this.banos,
      input.parqueaderos ?? this.parqueaderos,
      input.deposito ?? this.deposito,
      input.amenidades ?? this.amenidades,
      input.puntosInteres ?? this.puntosInteres,
      input.fotos ?? this.fotos,
      input.videos ?? this.videos,
      input.panoramas ?? this.panoramas,
      input.destacada ?? this.destacada,
      input.proyecto ?? this.proyecto,
    );
  }

  /**
   * Activa el inmueble (HIDDEN → ACTIVE). Valida que existen todos los campos
   * obligatorios (AC1.7.3) y que `precio` es entero > 0 (AC1.7.4).
   * La primera activación fija `fechaPublicacion` (AC1.7.5).
   */
  activate(now: Date = new Date()): ActivationResult {
    if (this.status === 'ACTIVE') {
      throw new ApiError('VALIDATION_ERROR', ERR_ALREADY_ACTIVE);
    }

    const missing: string[] = [];

    if (!this.operacion) missing.push('operacion');
    if (!this.tipo) missing.push('tipo');
    if (!this.titulo?.es) missing.push('titulo(es)');
    if (!this.departamento) missing.push('departamento');
    if (!this.municipio) missing.push('municipio');
    if (!this.precio) missing.push('precio');
    if (!this.fotos || this.fotos.length === 0) missing.push('al menos una foto');

    if (missing.length > 0) {
      throw new ApiError('VALIDATION_ERROR', ERR_MISSING_FIELDS_TO_ACTIVATE, missing);
    }

    const timestamp = now.toISOString();
    const firstActivation = this.fechaPublicacion === undefined;
    const fechaPublicacion = firstActivation ? timestamp : this.fechaPublicacion;

    return {
      property: new Property(
        this.id,
        this.codigo,
        this.slug,
        'ACTIVE',
        this.operacion,
        this.tipo,
        this.titulo,
        this.descripcion,
        this.precio,
        this.departamento,
        this.municipio,
        this.createdAt,
        timestamp,
        fechaPublicacion,
        this.estrato,
        this.predial,
        this.administracion,
        this.acabados,
        this.antiguedad,
        this.areaConstruida,
        this.areaLote,
        this.dormitorios,
        this.banos,
        this.parqueaderos,
        this.deposito,
        this.amenidades,
        this.puntosInteres,
        this.fotos,
        this.videos,
        this.panoramas,
        this.destacada,
        this.proyecto,
      ),
      firstActivation,
      fechaPublicacion,
    };
  }

  /**
   * Oculta el inmueble (ACTIVE → HIDDEN). No cambia `fechaPublicacion` (AC1.7.5).
   */
  hide(now: Date = new Date()): Property {
    if (this.status === 'HIDDEN') {
      throw new ApiError('VALIDATION_ERROR', ERR_ALREADY_HIDDEN);
    }

    return new Property(
      this.id,
      this.codigo,
      this.slug,
      'HIDDEN',
      this.operacion,
      this.tipo,
      this.titulo,
      this.descripcion,
      this.precio,
      this.departamento,
      this.municipio,
      this.createdAt,
      now.toISOString(),
      this.fechaPublicacion,
      this.estrato,
      this.predial,
      this.administracion,
      this.acabados,
      this.antiguedad,
      this.areaConstruida,
      this.areaLote,
      this.dormitorios,
      this.banos,
      this.parqueaderos,
      this.deposito,
      this.amenidades,
      this.puntosInteres,
      this.fotos,
      this.videos,
      this.panoramas,
      this.destacada,
      this.proyecto,
    );
  }

  /**
   * Soft delete: cambia a `DELETED`. Nunca borrado físico.
   */
  softDelete(now: Date = new Date()): Property {
    if (this.status === 'DELETED') {
      throw new ApiError('VALIDATION_ERROR', ERR_ALREADY_DELETED);
    }

    return new Property(
      this.id,
      this.codigo,
      this.slug,
      'DELETED',
      this.operacion,
      this.tipo,
      this.titulo,
      this.descripcion,
      this.precio,
      this.departamento,
      this.municipio,
      this.createdAt,
      now.toISOString(),
      this.fechaPublicacion,
      this.estrato,
      this.predial,
      this.administracion,
      this.acabados,
      this.antiguedad,
      this.areaConstruida,
      this.areaLote,
      this.dormitorios,
      this.banos,
      this.parqueaderos,
      this.deposito,
      this.amenidades,
      this.puntosInteres,
      this.fotos,
      this.videos,
      this.panoramas,
      this.destacada,
      this.proyecto,
    );
  }
}

/**
 * Genera un slug a partir de texto: minúsculas, solo alfanuméricos y guiones.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Valida que un código siga el patrón `JF-XXXX` (D6, AC1.7.1). */
export function validarCodigoSecuencial(codigo: string): void {
  if (!/^JF-\d{4}$/.test(codigo)) {
    throw new ApiError('VALIDATION_ERROR', 'El código debe seguir el patrón JF-XXXX');
  }
}
