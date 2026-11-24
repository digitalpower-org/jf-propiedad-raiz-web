import type { PropertyListParams } from '@/lib/api-catalog';

/**
 * Filtros del catálogo (US2.2). La URL es la única fuente de verdad (AC2.2.2).
 * Base de datos (D9/D28): tipo (un solo valor), ubicación (departamento + municipio juntos) y
 * rango de precio. Frontend: dormitorios, baños, área y estrato.
 */
export interface PropertyFilters {
  tipo?: string | undefined;
  departamento?: string | undefined;
  municipio?: string | undefined;
  precioMin?: number | undefined;
  precioMax?: number | undefined;
  dormitorios?: string | undefined;
  banos?: string | undefined;
  areaMin?: string | undefined;
  estrato?: string | undefined;
}

export const TIPOS_INMUEBLE_CATALOGO = [
  { value: 'CASA', label: { es: 'Casa', en: 'House' } },
  { value: 'APARTAMENTO', label: { es: 'Apartamento', en: 'Apartment' } },
  { value: 'LOTE_CAMPESTRE', label: { es: 'Lote Campestre', en: 'Country Lot' } },
  { value: 'LOTE_URBANO', label: { es: 'Lote Urbano', en: 'Urban Lot' } },
  { value: 'FINCA', label: { es: 'Finca', en: 'Farm' } },
  { value: 'LOCAL_COMERCIAL', label: { es: 'Local Comercial', en: 'Commercial Space' } },
  { value: 'BODEGA', label: { es: 'Bodega', en: 'Warehouse' } },
  { value: 'OFICINA', label: { es: 'Oficina', en: 'Office' } },
] as const;

const TIPOS_VALIDOS: readonly string[] = TIPOS_INMUEBLE_CATALOGO.map((tipo) => tipo.value);

/**
 * Lee los filtros de la URL. `tipo` admite un solo valor: si llega una lista
 * («CASA,FINCA», de enlaces antiguos) se conserva el primero, y si no es un tipo conocido se descarta.
 */
export function leerFiltrosDeUrl(params: URLSearchParams): PropertyFilters {
  const texto = (clave: string) => params.get(clave) || undefined;
  const numero = (clave: string) => {
    const valor = params.get(clave);
    return valor ? Number(valor) : undefined;
  };
  const primerTipo = params.get('tipo')?.split(',')[0]?.trim();

  return {
    tipo: primerTipo && TIPOS_VALIDOS.includes(primerTipo) ? primerTipo : undefined,
    departamento: texto('departamento'),
    municipio: texto('municipio'),
    precioMin: numero('precioMin'),
    precioMax: numero('precioMax'),
    dormitorios: texto('dormitorios'),
    banos: texto('banos'),
    areaMin: texto('areaMin'),
    estrato: texto('estrato'),
  };
}

export interface ErroresFiltros {
  /** departamento y municipio deben ir juntos o ninguno (D24). */
  readonly ubicacion: boolean;
  /** `formato`: no es un entero no negativo; `rango`: el mínimo supera al máximo. */
  readonly precio: 'formato' | 'rango' | null;
}

/** Combinaciones que el backend rechazaría con 400 (AC2.2.3): se impiden antes de pedir. */
export function validarFiltros(
  filtros: Pick<PropertyFilters, 'departamento' | 'municipio' | 'precioMin' | 'precioMax'>,
): ErroresFiltros {
  const { precioMin, precioMax } = filtros;
  const ubicacion = Boolean(filtros.departamento) !== Boolean(filtros.municipio);
  const formatoInvalido = [precioMin, precioMax].some(
    (valor) => valor !== undefined && (!Number.isInteger(valor) || valor < 0),
  );
  const rangoInvalido =
    !formatoInvalido && precioMin !== undefined && precioMax !== undefined && precioMin > precioMax;

  return { ubicacion, precio: formatoInvalido ? 'formato' : rangoInvalido ? 'rango' : null };
}

export function tieneErrores(errores: ErroresFiltros): boolean {
  return errores.ubicacion || errores.precio !== null;
}

/**
 * Parámetros que sí viajan a la API: solo los de base de datos y solo si son válidos.
 * Los de frontend (dormitorios, baños, área, estrato) nunca llegan al backend (D9).
 */
export function filtrosParaApi(filtros: PropertyFilters): Partial<PropertyListParams> {
  const errores = validarFiltros(filtros);
  return {
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(!errores.ubicacion && filtros.departamento && filtros.municipio
      ? { departamento: filtros.departamento, municipio: filtros.municipio }
      : {}),
    ...(errores.precio === null && filtros.precioMin ? { precioMin: filtros.precioMin } : {}),
    ...(errores.precio === null && filtros.precioMax ? { precioMax: filtros.precioMax } : {}),
  };
}

/** Filtros de frontend ya interpretados como números; `undefined` = filtro inactivo. */
export interface FiltrosFrontend {
  readonly dormitorios?: number | undefined;
  readonly banos?: number | undefined;
  readonly areaMin?: number | undefined;
  readonly estrato?: number | undefined;
}

/** Lo que hace falta de una tarjeta para filtrarla en el navegador. */
export interface TarjetaFiltrable {
  readonly dormitorios?: number | undefined;
  readonly banos?: number | undefined;
  readonly areaConstruida?: number | undefined;
  readonly estrato?: number | undefined;
}

const positivo = (valor: string | undefined): number | undefined => {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
};

/** Interpreta los filtros de frontend de la URL; un valor que no sea un número válido se ignora. */
export function leerFiltrosFrontend(
  filtros: Pick<PropertyFilters, 'dormitorios' | 'banos' | 'areaMin' | 'estrato'>,
): FiltrosFrontend {
  const estrato = positivo(filtros.estrato);
  return {
    dormitorios: positivo(filtros.dormitorios),
    banos: positivo(filtros.banos),
    areaMin: positivo(filtros.areaMin),
    estrato:
      estrato !== undefined && Number.isInteger(estrato) && estrato <= 6 ? estrato : undefined,
  };
}

export function hayFiltrosFrontend(filtros: FiltrosFrontend): boolean {
  return Object.values(filtros).some((valor) => valor !== undefined);
}

/**
 * Filtra en el navegador las tarjetas ya cargadas (D9, AC2.2.5). Dormitorios, baños y área son
 * «mínimo»; el estrato es exacto. Una tarjeta sin ese dato no cumple un filtro activo.
 */
export function filtrarEnNavegador<T extends TarjetaFiltrable>(
  tarjetas: readonly T[],
  filtros: FiltrosFrontend,
): T[] {
  const { dormitorios, banos, areaMin, estrato } = filtros;
  return tarjetas.filter(
    (tarjeta) =>
      (dormitorios === undefined ||
        (tarjeta.dormitorios !== undefined && tarjeta.dormitorios >= dormitorios)) &&
      (banos === undefined || (tarjeta.banos !== undefined && tarjeta.banos >= banos)) &&
      (areaMin === undefined ||
        (tarjeta.areaConstruida !== undefined && tarjeta.areaConstruida >= areaMin)) &&
      (estrato === undefined || tarjeta.estrato === estrato),
  );
}
