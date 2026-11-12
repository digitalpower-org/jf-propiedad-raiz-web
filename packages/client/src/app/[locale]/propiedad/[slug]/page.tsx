import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { isLocale } from '@/i18n/config';
import { fetchPropertyDetailServer } from '@/server/property-detail';
import { getOperacionLabel } from '@/components/catalog/property-card-utils';
import { buildPropertyJsonLd, buildPropertyMetadata, getBaseUrl } from '@/lib/property-seo';
import { JsonLd } from '@/components/seo/JsonLd';

import React, { cache, ReactElement } from 'react';
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

// cache(): metadatos y página comparten una sola consulta por petición.
const fetchProperty = cache(fetchPropertyDetailServer);

async function fetchPropertyOrNotFound(slug: string) {
  const property = await fetchProperty(slug);
  if (!property) notFound();
  return property;
}

export async function generateMetadata({ params }: PropiedadDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const property = await fetchPropertyOrNotFound(slug);
  if (property.status !== 'ACTIVE') return {};

  return buildPropertyMetadata({ property, locale, slug, baseUrl: getBaseUrl() });
}

export default async function PropiedadDetailPage({ params }: PropiedadDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const tProperty = await getTranslations('property');

  const property = await fetchPropertyOrNotFound(slug);
  if (property.status !== 'ACTIVE') notFound();

  const baseUrl = getBaseUrl();
  const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug })}`;
  const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug })}`;

  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const descripcion = property.descripcion[locale] ?? property.descripcion.es ?? '';

  const jsonLd = buildPropertyJsonLd({ property, locale, slug, baseUrl });

  const videos = property.videos ? property.videos.filter((v): v is string => v !== undefined) : [];
  const panoramas = property.panoramas
    ? property.panoramas.filter((p): p is import('@jf/shared-types').Panorama => p !== undefined)
    : [];
  const fotos = property.fotos ?? [];
  const puntosInteres = property.puntosInteres ?? [];

  return (
    <main className={styles.page}>
      <JsonLd data={jsonLd} />
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <ol className={styles.breadcrumbList}>
          <li>
            <a href={getRoute('home', locale)}>{tProperty('breadcrumbHome')}</a>
          </li>
          <li>
            <a href={getRoute('sale', locale)}>{tProperty('operation')}</a>
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
