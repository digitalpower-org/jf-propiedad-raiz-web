/**
 * Configuración de idiomas (US0.4).
 *
 * `es` es el idioma por defecto: se usa cuando `Accept-Language` no ofrece
 * ninguno soportado (AC0.4.2).
 */

export const locales = ['es', 'en'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

const supported: readonly string[] = locales;

/** Guard de tipo para valores que llegan de la URL o de una cabecera. */
export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && supported.includes(value);
}
