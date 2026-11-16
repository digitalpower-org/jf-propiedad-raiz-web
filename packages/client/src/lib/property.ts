/**
 * Reglas de presentación de inmuebles que no se persisten en el backend.
 *
 * La insignia «Nuevo» (US1.11, AC1.11.1 a AC1.11.3) se deriva de `createdAt`: no existe
 * un campo `nuevo` en Firestore. El umbral por defecto son `NEW_PROPERTY_DAYS` días y se
 * puede cambiar con la variable de entorno `NEW_FLAG_DAYS` (AC1.11.3).
 */

export const NEW_PROPERTY_DAYS = 30;

const MILLISECONDS_PER_DAY = 86_400_000;

/**
 * Interpreta `NEW_FLAG_DAYS`: solo vale un número positivo. Si falta, está vacío o es
 * inválido se usa `NEW_PROPERTY_DAYS`.
 */
export function resolveNewFlagDays(raw: string | undefined): number {
  const days = Number(raw);
  return Number.isFinite(days) && days > 0 ? days : NEW_PROPERTY_DAYS;
}

/**
 * `true` mientras la antigüedad de `createdAt` sea estrictamente menor al umbral.
 * `process.env.NEW_FLAG_DAYS` se escribe literal para que Next lo inyecte en el cliente.
 */
export function isNewProperty(
  createdAt: string | Date,
  now: Date = new Date(),
  days: number = resolveNewFlagDays(process.env.NEW_FLAG_DAYS),
): boolean {
  const createdTime = createdAt instanceof Date ? createdAt.getTime() : Date.parse(createdAt);
  if (Number.isNaN(createdTime)) return false;

  return now.getTime() - createdTime < days * MILLISECONDS_PER_DAY;
}
