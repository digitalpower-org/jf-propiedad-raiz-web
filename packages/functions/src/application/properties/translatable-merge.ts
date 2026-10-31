// Translatable merge (5.3)
// Función pura que resuelve el estado de un campo Translatable al guardar.
// No conoce el proveedor de traducción ni el esquema de Firestore: recibe
// los valores ya resueltos y una función de traducción inyectada.

import type { Translatable } from '@jf/shared-types';

export interface TranslatableInput {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
}

export type TranslatableStatus = 'Actualizada' | 'Pendiente';

export interface MergeTranslatableResult {
  readonly es: string;
  readonly en: string | undefined;
  readonly autoTranslate: boolean;
  readonly enPendiente: boolean;
  readonly status: TranslatableStatus;
}

/**
 * Resuelve el estado de un campo Translatable al guardar.
 *
 * Reglas:
 * 1. input.en presente y distinto → persistir tal cual, enPendiente=false, no traducir (AC0.5.12).
 * 2. es cambió + autoTranslate activo → traducir; éxito → en=translated, enPendiente=false;
 *    fallo → conservar en anterior, enPendiente=true (AC0.5.11).
 * 3. es cambió + autoTranslate inactivo → conservar en anterior, enPendiente=true (AC0.5.11).
 * 4. Campo nuevo + autoTranslate activo → traducir; fallo → en='', enPendiente=true.
 * 5. es no cambió → no traducir (evita costo, cumple AC0.5.12).
 *
 * Estado "Actualizada" = en no vacío y enPendiente === false.
 *
 * @param existing valor actual en Firestore (o { es: '' } para campo nuevo)
 * @param input DTO de entrada del admin
 * @param autoTranslate valor resuelto del interruptor para este campo (default true si se omite)
 * @param translate función que traduce ES→EN; lanza si falla
 */
export async function mergeTranslatable(
  existing: Translatable,
  input: TranslatableInput,
  autoTranslate: boolean,
  translate: (text: string) => Promise<string>,
): Promise<MergeTranslatableResult> {
  const resolvedAutoTranslate = autoTranslate ?? true;
  const esChanged = existing.es !== input.es;
  const isNew = !existing.es;
  const hasInputEn = input.en !== undefined && input.en !== '';

  // Rama 1: el admin envió un en distinto → persistir tal cual, no traducir (AC0.5.12)
  if (hasInputEn && input.en !== existing.en) {
    return {
      es: input.es,
      en: input.en,
      autoTranslate: resolvedAutoTranslate,
      enPendiente: false,
      status: 'Actualizada',
    };
  }

  // Rama 5: es no cambió → no traducir (evita costo, cumple AC0.5.12)
  if (!esChanged) {
    return {
      es: input.es,
      en: existing.en,
      autoTranslate: resolvedAutoTranslate,
      enPendiente: existing.enPendiente ?? false,
      status: existing.en && !existing.enPendiente ? 'Actualizada' : 'Pendiente',
    };
  }

  // A partir de aquí: es cambió
  if (!resolvedAutoTranslate) {
    // Rama 3: es cambió + autoTranslate inactivo → conservar en anterior, Pendiente (AC0.5.11)
    return {
      es: input.es,
      en: existing.en,
      autoTranslate: false,
      enPendiente: true,
      status: 'Pendiente',
    };
  }

  // autoTranslate activo: intentar traducir
  try {
    const translated = await translate(input.es);

    // Rama 2: es cambió + autoTranslate activo → éxito
    // Rama 4: campo nuevo + autoTranslate activo → éxito
    return {
      es: input.es,
      en: translated,
      autoTranslate: true,
      enPendiente: false,
      status: 'Actualizada',
    };
  } catch {
    // Rama 2/4 fallo: conservar en anterior (rama 2) o en='' (rama 4), Pendiente
    return {
      es: input.es,
      en: isNew ? '' : existing.en,
      autoTranslate: true,
      enPendiente: true,
      status: 'Pendiente',
    };
  }
}
