/**
 * Mensajes de error y éxito compartidos para handlers de properties.
 * Evita duplicación de strings literales en cada handler.
 */

// Mensajes de éxito
export const MSG_PROPERTY_CREATED = 'Inmueble creado';
export const MSG_PROPERTY_UPDATED = 'Inmueble actualizado';
export const MSG_PROPERTY_DELETED = 'Inmueble eliminado';
export const MSG_PROPERTY_ACTIVATED = 'Inmueble activado';
export const MSG_PROPERTY_HIDDEN = 'Inmueble oculto';
export const MSG_PROPERTY_OBTAINED = 'Inmueble obtenido';
export const MSG_MEDIA_PRESIGNED = 'URL presignada generada';
export const MSG_MEDIA_CONFIRMED = 'Subida confirmada y derivados generados';

// Mensajes de éxito de servicios (services.ts)
export const MSG_SERVICE_CREATED = 'Servicio creado';
export const MSG_SERVICE_UPDATED = 'Servicio actualizado';
export const MSG_SERVICE_DELETED = 'Servicio eliminado';
export const MSG_SERVICE_ACTIVATED = 'Servicio activado';
export const MSG_SERVICE_HIDDEN = 'Servicio oculto';
export const MSG_SERVICE_REORDERED = 'Servicios reordenados';
export const MSG_SERVICE_OBTAINED = 'Servicio obtenido';

// Mensajes de éxito de Nosotros (about.ts)
export const MSG_ABOUT_SAVED = 'Nosotros guardado';

// Mensajes de error de dominio (property.ts)
export const ERR_TITLE_REQUIRED = 'El título en español es obligatorio';
export const ERR_ALREADY_ACTIVE = 'El inmueble ya está activo';
export const ERR_ALREADY_HIDDEN = 'El inmueble ya está oculto';
export const ERR_ALREADY_DELETED = 'El inmueble ya está eliminado';
export const ERR_MISSING_FIELDS_TO_ACTIVATE = 'Campos obligatorios para activar';

// Mensajes de error de dominio (services.ts)
export const ERR_SERVICE_ALREADY_ACTIVE = 'El servicio ya está activo';
export const ERR_SERVICE_ALREADY_HIDDEN = 'El servicio ya está oculto';
export const ERR_SERVICE_ALREADY_DELETED = 'El servicio ya está eliminado';

// Mensajes de error de infraestructura (firestore-properties-repository.ts)
export function errPropertyNotFound(idOrSlug: string): string {
  return `Inmueble no encontrado: ${idOrSlug}`;
}

// Mensajes de error de infraestructura (firestore-services-repository.ts)
export function errServiceNotFound(id: string): string {
  return `Servicio no encontrado: ${id}`;
}
