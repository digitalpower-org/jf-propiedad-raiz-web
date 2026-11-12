/**
 * SEO de la ficha pública (AC2.7): metadatos y JSON-LD como funciones puras,
 * para poder probarlas sin levantar Next.
 */

import type { Metadata } from 'next';
import type { PropertyDetail } from '@jf/shared-types';
import { getRoute } from '@/i18n/routes';

export type SeoLocale = 'es' | 'en';

export const SITE_NAME = 'JF Propiedad Raíz';

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
}

export interface PropertySeoInput {
  property: PropertyDetail;
  locale: SeoLocale;
  slug: string;
  baseUrl: string;
}

function resolveSeoBasics({ property, locale, slug, baseUrl }: PropertySeoInput) {
  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const descripcion = property.descripcion[locale] ?? property.descripcion.es ?? '';
  const derivados = property.fotos?.[0]?.derivados;
  const portada = derivados?.[2]?.clave ?? derivados?.[1]?.clave ?? derivados?.[0]?.clave;

  return {
    titulo,
    descripcion,
    canonicalUrl: `${baseUrl}${getRoute('property', locale, { slug })}`,
    alternateEs: `${baseUrl}${getRoute('property', 'es', { slug })}`,
    alternateEn: `${baseUrl}${getRoute('property', 'en', { slug })}`,
    imageUrl: portada ? `${baseUrl}/${portada}` : `${baseUrl}/og-default.jpg`,
  };
}

/** JSON-LD de la ficha (AC2.7.6): sin claves `undefined`, con idioma y país. */
export function buildPropertyJsonLd(input: PropertySeoInput): Record<string, unknown> {
  const { property, locale, baseUrl } = input;
  const { titulo, descripcion, canonicalUrl, imageUrl } = resolveSeoBasics(input);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: titulo,
    description: descripcion,
    url: canonicalUrl,
    image: imageUrl,
    offers: {
      '@type': 'Offer',
      price: property.precio,
      priceCurrency: 'COP',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        priceCurrency: 'COP',
        price: property.precio,
      },
      availability: 'https://schema.org/InStock',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.municipio,
      addressRegion: property.departamento,
      addressCountry: 'CO',
    },
    floorSize: property.areaConstruida
      ? { '@type': 'QuantitativeValue', value: property.areaConstruida, unitCode: 'MTK' }
      : undefined,
    numberOfRooms: property.dormitorios,
    numberOfBathroomsTotal: property.banos,
    inLanguage: locale === 'es' ? 'es-CO' : 'en',
    publisher: { '@type': 'Organization', name: SITE_NAME, url: baseUrl },
  };

  // Elimina las claves undefined: el JSON-LD final no debe contenerlas.
  return JSON.parse(JSON.stringify(jsonLd)) as Record<string, unknown>;
}

/** Serializa para incrustar en <script>: escapa `<` para que no cierre la etiqueta. */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Metadatos de la ficha (AC2.7.1/2.7.2/2.7.3): título, canonical, hreflang, OG, Twitter. */
export function buildPropertyMetadata(input: PropertySeoInput): Metadata {
  const { property, locale } = input;
  const { titulo, descripcion, canonicalUrl, alternateEs, alternateEn, imageUrl } =
    resolveSeoBasics(input);

  return {
    title: `${titulo} | ${SITE_NAME}`,
    description: descripcion.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'es-CO': alternateEs,
        en: alternateEn,
        'x-default': alternateEs,
      },
    },
    openGraph: {
      title: titulo,
      description: descripcion.slice(0, 160),
      url: canonicalUrl,
      type: 'website',
      locale: locale === 'es' ? 'es-CO' : 'en_US',
      siteName: SITE_NAME,
      images: [{ url: imageUrl, width: 1280, height: 720, alt: titulo }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descripcion.slice(0, 160),
      images: [imageUrl],
    },
    robots: {
      index: !!(property.titulo.en && property.descripcion.en),
      follow: true,
    },
  };
}
