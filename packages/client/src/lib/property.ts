/**
 * Reglas de presentación de inmuebles que no se persisten en el backend.
 *
 * La insignia «Nuevo» (US1.11, AC2.2.11) se deriva de `createdAt`: no existe
 * un campo `nuevo` en Firestore ni en la API.
 */

export const NEW_PROPERTY_DAYS = 30;

const MILLISECONDS_PER_DAY = 86_400_000;

/** `true` mientras la antigüedad de `createdAt` sea estrictamente menor a 30 días. */
export function isNewProperty(createdAt: string | Date, now: Date = new Date()): boolean {
  const createdTime = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (Number.isNaN(createdTime)) return false;

  return now.getTime() - createdTime < NEW_PROPERTY_DAYS * MILLISECONDS_PER_DAY;
}
