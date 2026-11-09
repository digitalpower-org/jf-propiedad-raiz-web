import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { isLocale } from '@/i18n/config';
import { fetchPropertyBySlug } from '@/lib/api-catalog';
import { getOperacionLabel } from '@/components/catalog/property-card-utils';

import React, { ReactElement } from 'react';
import { PropertyGallery } from '@/components/catalog/PropertyGallery';
import { PropertyStickySidebar } from '@/components/catalog/PropertyStickySidebar';
import { PropertySpecs } from '@/components/catalog/PropertySpecs';
import { PropertyPOIs } from '@/components/catalog/PropertyPOIs';
import { VideoFacade } from '@/components/catalog/VideoFacade';
import { PanoramaViewer } from '@/components/catalog/PanoramaViewer';

import styles from './page.module.css';

type PropiedadDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

async function fetchPropertyOrNotFound(slug: string, locale: string) {
  const response = await fetchPropertyBySlug(slug, locale as 'es' | 'en');
  if (!response.success || !response.data) {
    notFound();
  }
  return response.data;
}

async function generateMetadata({ params }: PropiedadDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const property = await fetchPropertyOrNotFound(slug, locale);
  if (property.status !== 'ACTIVE') return {};

  const t = await getTranslations('property');

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
  const canonicalUrl = `${baseUrl}${getRoute('property', locale, { slug })}`;
  const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug })}`;
  const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug })}`;

  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const descripcion = property.descripcion[locale] ?? property.descripcion.es ?? '';
  const portadaDerivados = property.fotos?.[0]?.derivados;
  const portada =
    portadaDerivados?.[2]?.clave ?? portadaDerivados?.[1]?.clave ?? portadaDerivados?.[0]?.clave;
  const imageUrl = portada ? `${baseUrl}/${portada}` : `${baseUrl}/og-default.jpg`;

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
      ? {
          '@type': 'QuantitativeValue',
          value: property.areaConstruida,
          unitCode: 'MTK',
        }
      : undefined,
    numberOfRooms: property.dormitorios,
    numberOfBathroomsTotal: property.banos,
    inLanguage: locale === 'es' ? 'es-CO' : 'en',
    publisher: {
      '@type': 'Organization',
      name: 'JF Propiedad Raíz',
      url: baseUrl,
    },
  };

  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return {
    title: `${titulo} | JF Propiedad Raíz`,
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
      siteName: 'JF Propiedad Raíz',
      images: [
        {
          url: imageUrl,
          width: 1280,
          height: 720,
          alt: titulo,
        },
      ],
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
    other: {
      'application/ld+json': JSON.stringify(cleanJsonLd),
    },
  };
}

export default async function PropiedadDetailPage({ params }: PropiedadDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const tProperty = await getTranslations('property');

  const property = await fetchPropertyOrNotFound(slug, locale);

  const hasFullTranslation = !!(property.titulo.en && property.descripcion.en);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
  const canonicalUrl = `${baseUrl}${getRoute('property', locale, { slug })}`;
  const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug })}`;
  const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug })}`;

  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const descripcion = property.descripcion[locale] ?? property.descripcion.es ?? '';
  const portadaDerivados = property.fotos?.[0]?.derivados;
  const portada =
    portadaDerivados?.[2]?.clave ?? portadaDerivados?.[1]?.clave ?? portadaDerivados?.[0]?.clave;

  const videos = property.videos ? property.videos.filter((v): v is string => v !== undefined) : [];
  const panoramas = property.panoramas
    ? property.panoramas.filter((p): p is import('@jf/shared-types').Panorama => p !== undefined)
    : [];
  const fotos = property.fotos ?? [];
  const puntosInteres = property.puntosInteres ?? [];

  return (
    <main className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li>
            <a href={getRoute('home', locale)}>
              {tProperty('breadcrumbHome')}
            </a>
          </li>
          <li>
            <a href={getRoute('sale', locale)}>
              {tProperty('operation')}
            </a>
          </li>
          <li aria-current="page">{titulo}</li>
        </ol>
      </nav>

      <article className={styles.article}>
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <span className={styles.operationTag}>
              {getOperacionLabel(property.operacion, locale)}
            </span>
            <span className={styles.code}>{property.codigo}</span>
          </div>
          <h1 className={styles.title}>{titulo}</h1>
          <p className={styles.location}>
            <svg
              className={styles.locationIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {property.municipio}, {property.departamento}
          </p>
        </header>

        <div className={styles.grid}>
          <div className={styles.galleryColumn}>
            <PropertyGallery
              fotos={fotos}
              videos={videos}
              panoramas={panoramas}
              titulo={titulo}
              locale={locale}
            />
          </div>

          <aside className={styles.sidebarColumn}>
            <PropertyStickySidebar property={property} locale={locale} />
            <PropertySpecs property={property} locale={locale} />
          </aside>
        </div>

        {descripcion && (
          <section className={styles.descriptionSection} aria-labelledby="description-title">
            <h2 id="description-title" className={styles.sectionTitle}>
              {tProperty('descriptionTitle')}
            </h2>
            <div className={styles.descriptionText}>
              {property.descripcion[locale] ?? property.descripcion.es}
            </div>
          </section>
        )}

        <PropertyPOIs puntosInteres={puntosInteres} locale={locale} />
        <VideoFacade videos={videos} locale={locale} />
        <PanoramaViewer panoramas={panoramas} locale={locale} />

        {property.operacion === 'PROYECTO_SOBRE_PLANOS' && property.proyecto && (
          <section className={styles.projectSection} aria-labelledby="project-title">
            <h2 id="project-title" className={styles.sectionTitle}>
              {tProperty('projectTitle')}
            </h2>
            <dl className={styles.projectDetails}>
              <div>
                <dt>{tProperty('projectStage')}</dt>
                <dd>{property.proyecto.etapa[locale] ?? property.proyecto.etapa.es}</dd>
              </div>
              {property.proyecto.fechaEntregaEstimada && (
                <div>
                  <dt>{tProperty('projectDelivery')}</dt>
                  <dd>{property.proyecto.fechaEntregaEstimada}</dd>
                </div>
              )}
              {property.proyecto.unidadesDisponibles && (
                <div>
                  <dt>{tProperty('projectUnits')}</dt>
                  <dd>{property.proyecto.unidadesDisponibles}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <nav className={styles.langSwitcher} aria-label="Cambiar idioma">
          <a
            href={locale === 'es' ? alternateEn : alternateEs}
            hrefLang={locale === 'es' ? 'en' : 'es-CO'}
            className={styles.langLink}
          >
            {tProperty('langSwitcher')}
          </a>
        </nav>
      </article>
    </main>
  );
}
