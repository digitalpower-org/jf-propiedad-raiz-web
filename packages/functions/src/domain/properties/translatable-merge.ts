// Translatable merge (5.3)
// Función pura que resuelve el estado de un campo Translatable al guardar.
// No conoce el proveedor de traducción ni el esquema de Firestore: recibe
// los valores ya resueltos y una función de traducción inyectada.

/**
 * Estado persistido de un campo traducible. Se declara en Domain para no
 * depender de los contratos generados (el shape coincide con `Translatable`).
 */
export interface TranslatableState {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
  readonly enPendiente?: boolean;
}

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
 * 1. es vacío → en vacío, sin traducir (AC0.5.3).
 * 2. input.en presente y no vacío → persistir tal cual, enPendiente=false, no traducir,
 *    incluso si es igual al valor previo (AC0.5.4/AC0.5.12).
 * 3. autoTranslate inactivo → conservar en anterior, enPendiente=true (AC0.5.11).
 * 4. es no cambió y en previo relleno → no traducir (control de costo, AC0.5.2).
 * 5. autoTranslate activo y (es cambió o en previo vacío) → traducir; éxito → en=translated,
 *    enPendiente=false; fallo → en='', enPendiente=true, nunca en previo (AC0.5.5).
 *
 * Estado "Actualizada" = en no vacío y enPendiente === false.
 *
 * @param existing valor actual en Firestore (o { es: '' } para campo nuevo)
 * @param input DTO de entrada del admin
 * @param autoTranslate valor resuelto del interruptor para este campo (default true si se omite)
 * @param translate función que traduce ES→EN; lanza si falla
 */
export async function mergeTranslatable(
  existing: TranslatableState,
  input: TranslatableInput,
  autoTranslate: boolean,
  translate: (text: string) => Promise<string>,
): Promise<MergeTranslatableResult> {
  const resolvedAutoTranslate = autoTranslate ?? true;
  const hasInputEn = input.en !== undefined && input.en !== '';
  const esChanged = existing.es !== input.es;

  // Rama AC0.5.3: es vacío → en vacío, sin traducir
  if (input.es === '') {
    return {
      es: '',
      en: '',
      autoTranslate: resolvedAutoTranslate,
      enPendiente: false,
      status: 'Pendiente',
    };
  }

  // Rama AC0.5.4/AC0.5.12: en manual no vacío gana, nunca traduce (aunque igual al previo)
  if (hasInputEn) {
    return {
      es: input.es,
      en: input.en,
      autoTranslate: resolvedAutoTranslate,
      enPendiente: false,
      status: 'Actualizada',
    };
  }

  // Rama AC0.5.11: autoTranslate inactivo → conservar en anterior, Pendiente
  if (!resolvedAutoTranslate) {
    return {
      es: input.es,
      en: existing.en,
      autoTranslate: false,
      enPendiente: true,
      status: 'Pendiente',
    };
  }

  // Rama AC0.5.2: es no cambió y en previo relleno → no traducir (control de costo)
  if (!esChanged && existing.en) {
    return {
      es: input.es,
      en: existing.en,
      autoTranslate: resolvedAutoTranslate,
      enPendiente: existing.enPendiente ?? false,
      status: existing.en && !existing.enPendiente ? 'Actualizada' : 'Pendiente',
    };
  }

  // Rama AC0.5.5: autoTranslate activo y (es cambió o en previo vacío) → traducir
  try {
    const translated = await translate(input.es);

    return {
      es: input.es,
      en: translated,
      autoTranslate: true,
      enPendiente: false,
      status: 'Actualizada',
    };
  } catch {
    return {
      es: input.es,
      en: '',
      autoTranslate: true,
      enPendiente: true,
      status: 'Pendiente',
    };
  }
}
