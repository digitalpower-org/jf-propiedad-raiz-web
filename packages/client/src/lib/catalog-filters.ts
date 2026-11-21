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
