import type { PropertyListParams } from './api-catalog';
import { TIPOS_INMUEBLE_CATALOGO, type FiltrosFrontend } from './catalog-filters';

// US2.2 / AC2.2.10: texto legible de los filtros activos, para el mensaje de WhatsApp del estado
// vacío. Funciones puras: sin i18n de React, el idioma llega como argumento.

type Idioma = 'es' | 'en';

const miles = (valor: number, separador: string) =>
  String(valor).replace(/\B(?=(\d{3})+(?!\d))/g, separador);

function resumenPrecio(min: number | undefined, max: number | undefined, idioma: Idioma) {
  const sep = idioma === 'es' ? '.' : ',';
  const desde = min === undefined ? undefined : miles(min, sep);
  const hasta = max === undefined ? undefined : miles(max, sep);
  if (desde !== undefined && hasta !== undefined) {
    return idioma === 'es'
      ? `precio entre ${desde} y ${hasta} COP`
      : `price between COP ${desde} and ${hasta}`;
  }
  if (desde !== undefined) {
    return idioma === 'es' ? `precio desde ${desde} COP` : `price from COP ${desde}`;
  }
  if (hasta !== undefined) {
    return idioma === 'es' ? `precio hasta ${hasta} COP` : `price up to COP ${hasta}`;
  }
  return undefined;
}

/** Orden fijo: tipo, ubicación, precio, dormitorios, baños, área y estrato. Sin filtros: ''. */
export function resumirFiltros(
  filtros: Partial<PropertyListParams>,
  frontend: FiltrosFrontend,
  idioma: Idioma,
): string {
  const es = idioma === 'es';
  const tipo = TIPOS_INMUEBLE_CATALOGO.find((t) => t.value === filtros.tipo)?.label[idioma];
  const { municipio, departamento } = filtros;
  const ubicacion = municipio && departamento ? `${municipio} (${departamento})` : municipio;

  const partes = [
    tipo,
    ubicacion ?? departamento,
    resumenPrecio(filtros.precioMin, filtros.precioMax, idioma),
    frontend.dormitorios === undefined
      ? undefined
      : es
        ? `mín. ${frontend.dormitorios} dormitorios`
        : `min. ${frontend.dormitorios} bedrooms`,
    frontend.banos === undefined
      ? undefined
      : es
        ? `mín. ${frontend.banos} baños`
        : `min. ${frontend.banos} bathrooms`,
    frontend.areaMin === undefined
      ? undefined
      : es
        ? `área mín. ${frontend.areaMin} m²`
        : `min. area ${frontend.areaMin} m²`,
    frontend.estrato === undefined
      ? undefined
      : es
        ? `estrato ${frontend.estrato}`
        : `stratum ${frontend.estrato}`,
  ];
  return partes.filter((parte): parte is string => Boolean(parte)).join(', ');
}

/** Mensaje prediseñado de WhatsApp para un listado sin resultados (AC2.2.10). */
export function mensajeSinResultados(resumen: string, idioma: Idioma): string {
  if (idioma === 'es') {
    return resumen
      ? `Hola, busco un inmueble con estos criterios: ${resumen}. No lo encontré en el catálogo, ¿me pueden ayudar?`
      : 'Hola, no encontré el inmueble que busco en el catálogo. ¿Me pueden ayudar?';
  }
  return resumen
    ? `Hello, I am looking for a property with these criteria: ${resumen}. I could not find it in the catalog, can you help me?`
    : 'Hello, I could not find the property I am looking for in the catalog. Can you help me?';
}

/**
 * URL de WhatsApp del estado vacío (AC2.2.10). Sin número configurado no hay enlace, y por tanto
 * no hay botón. `construir` es el constructor de la URL (buildWhatsAppUrl): se inyecta para poder
 * probar esta decisión sin depender de la variable de entorno.
 */
export function urlWhatsAppSinResultados(
  numero: string | null,
  resumen: string,
  idioma: Idioma,
  construir: (parametros: { readonly number: string; readonly message: string }) => string,
): string | null {
  if (!numero) return null;
  return construir({ number: numero, message: mensajeSinResultados(resumen, idioma) });
}
