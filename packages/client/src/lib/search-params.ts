/**
 * Convierte el objeto `searchParams` que Next entrega a las páginas del servidor en un
 * `URLSearchParams`, para leer los filtros con las mismas funciones que usa el cliente (AC2.2.12).
 * Con un valor repetido conserva el primero.
 */
export function aURLSearchParams(
  consulta: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    const unico = Array.isArray(valor) ? valor[0] : valor;
    if (unico !== undefined) params.set(clave, unico);
  }
  return params;
}
