/**
 * Helper puro para derivar el slug de un servicio a partir del título en español.
 * Compartido por `crear-services` y `actualizar-services` para validar unicidad.
 * El slug resultante cumple el patrón `^[a-z0-9]+(?:-[a-z0-9]+)*$`.
 */

export function slugDesdeTitulo(tituloEs: string): string {
  return tituloEs
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
