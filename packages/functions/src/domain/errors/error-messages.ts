/**
 * Mensajes de error de dominio compartidos.
 *
 * Se declaran en Domain para que tanto Domain como Application e Infrastructure
 * puedan usarlos sin romper la regla de dependencias (Domain no importa de
 * Presentation ni de Infrastructure).
 */

// Property entity (US1.7)
export const ERR_TITLE_REQUIRED = 'El título en español es obligatorio';
export const ERR_ALREADY_ACTIVE = 'El inmueble ya está activo';
export const ERR_ALREADY_HIDDEN = 'El inmueble ya está oculto';
export const ERR_ALREADY_DELETED = 'El inmueble ya está eliminado';
export const ERR_MISSING_FIELDS_TO_ACTIVATE = 'Campos obligatorios para activar';

// PropertiesRepository (Infrastructure)
export function errPropertyNotFound(idOrSlug: string): string {
  return `Inmueble no encontrado: ${idOrSlug}`;
}
