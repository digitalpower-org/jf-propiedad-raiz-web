/**
 * Negociación de idioma a partir de `Accept-Language` (AC0.4.2).
 *
 * Función pura para poder probarla sin servidor. Respeta los pesos `q=` y
 * compara solo el subtag primario (`en-US` → `en`, `es-CO` → `es`).
 * Si no hay coincidencia, devuelve el idioma por defecto (`es`).
 */

import { defaultLocale, isLocale, type Locale } from './config';

type Candidate = { readonly tag: string; readonly weight: number };

function parseCandidates(header: string): Candidate[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...rest] = part.trim().split(';');
      const qParam = rest.map((item) => item.trim()).find((item) => item.startsWith('q='));
      const weight = qParam === undefined ? 1 : Number.parseFloat(qParam.slice(2));
      return { tag: tag.trim().toLowerCase(), weight: Number.isFinite(weight) ? weight : 0 };
    })
    .filter((candidate) => candidate.tag !== '' && candidate.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (acceptLanguage === null || acceptLanguage.trim() === '') return defaultLocale;

  for (const candidate of parseCandidates(acceptLanguage)) {
    const primary = candidate.tag.split('-')[0];
    if (isLocale(primary)) return primary;
  }

  return defaultLocale;
}
