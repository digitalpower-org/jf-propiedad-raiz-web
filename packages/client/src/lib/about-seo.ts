import type { Metadata } from 'next';
import { getRoute } from '@/i18n/routes';
import type { Locale } from '@/i18n/config';
import type { AboutData } from '@/server/about';
import { pickTranslatable } from './translatable';
import { SITE_NAME, getBaseUrl } from './property-seo';

const MAX_DESCRIPCION = 160;

export interface AboutSeoInput {
  /** Documento de Nosotros; `null` si no existe o no se pudo leer. */
  readonly about: AboutData | null;
  readonly locale: Locale;
  /** Título que se usa cuando el documento no trae `titulo` (viene del diccionario). */
  readonly tituloRespaldo: string;
}

/**
 * Metadatos de «Nosotros» (AC5.6.4, AC2.7.1, AC2.7.2): título y descripción del idioma de la página
 * (`titulo` y `extracto`, con respaldo al español), canonical y hreflang. Según AC0.4.5, la página
 * en inglés sin traducción del título lleva `noindex`; sin documento no se indexa ningún idioma.
 */
export function buildAboutMetadata({ about, locale, tituloRespaldo }: AboutSeoInput): Metadata {
  const base = getBaseUrl();
  const alternateEs = `${base}${getRoute('about', 'es')}`;
  const alternateEn = `${base}${getRoute('about', 'en')}`;
  const canonical = locale === 'es' ? alternateEs : alternateEn;

  const titulo = pickTranslatable(about?.titulo, locale) || tituloRespaldo;
  const descripcion = pickTranslatable(about?.extracto, locale).slice(0, MAX_DESCRIPCION);
  const indexar = about !== null && (locale === 'es' || Boolean(about.titulo.en?.trim()));
  const conDescripcion = descripcion ? { description: descripcion } : {};

  return {
    title: `${titulo} | ${SITE_NAME}`,
    ...conDescripcion,
    alternates: {
      canonical,
      languages: { 'es-CO': alternateEs, en: alternateEn, 'x-default': alternateEs },
    },
    openGraph: {
      title: titulo,
      ...conDescripcion,
      url: canonical,
      type: 'website',
      locale: locale === 'es' ? 'es-CO' : 'en_US',
      siteName: SITE_NAME,
    },
    robots: { index: indexar, follow: true },
  };
}
