import type { Translatable } from '@jf/shared-types';
import type { Locale } from '@/i18n/config';

/** Texto en el idioma pedido; si falta la traducción, el español (AC0.4.5). Vacío si no hay ninguno. */
export function pickTranslatable(valor: Translatable | undefined, locale: Locale): string {
  return valor?.[locale]?.trim() || valor?.es?.trim() || '';
}
