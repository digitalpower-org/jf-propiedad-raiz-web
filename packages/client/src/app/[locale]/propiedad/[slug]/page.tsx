import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { getPropertyBySlug } from '@/mocks/property-mock';
import { isLocale } from '@/i18n/config';

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

async function generateMetadata({ params }: PropiedadDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};

  const property = getPropertyBySlug(slug);
  if (!property || property.status !== 'ACTIVE') return {};

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
      locale: locale === 'es' ? 'es_CO' : 'en_US',
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

  const property = getPropertyBySlug(slug);
  if (!property || property.status !== 'ACTIVE') notFound();

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
    <html lang={locale === 'es' ? 'es-CO' : 'en'}>
      <head>
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es-CO" href={alternateEs} />
        <link rel="alternate" hrefLang="en" href={alternateEn} />
        <link rel="alternate" hrefLang="x-default" href={alternateEs} />
        {!hasFullTranslation && <meta name="robots" content="noindex, nofollow" />}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateListing',
              name: property.titulo[locale] ?? property.titulo.es ?? '',
              description: property.descripcion[locale] ?? property.descripcion.es ?? '',
              url: canonicalUrl,
              image: portada ? `${baseUrl}/${portada}` : `${baseUrl}/og-default.jpg`,
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
            }),
          }}
        />
      </head>
      <body className={styles.page}>
        <main className={styles.main}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <ol className={styles.breadcrumbList}>
              <li>
                <a href={getRoute('home', locale)}>{locale === 'es' ? 'Inicio' : 'Home'}</a>
              </li>
              <li>
                <a href={getRoute(locale === 'es' ? 'sale' : 'sale', locale)}>
                  {locale === 'es' ? 'Venta' : 'For Sale'}
                </a>
              </li>
              <li aria-current="page">{property.titulo[locale] ?? property.titulo.es}</li>
            </ol>
          </nav>

          <article className={styles.article}>
            <header className={styles.header}>
              <div className={styles.headerTop}>
                <span className={styles.operationTag}>
                  {locale === 'es'
                    ? property.operacion === 'VENTA'
                      ? 'Venta'
                      : property.operacion === 'ALQUILER'
                        ? 'Alquiler'
                        : 'Proyecto'
                    : property.operacion === 'VENTA'
                      ? 'For Sale'
                      : property.operacion === 'ALQUILER'
                        ? 'For Rent'
                        : 'Off-Plan'}
                </span>
                <span className={styles.code}>{property.codigo}</span>
              </div>
              <h1 className={styles.title}>{property.titulo[locale] ?? property.titulo.es}</h1>
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
                  fotos={property.fotos ?? []}
                  videos={
                    property.videos
                      ? property.videos.filter((v): v is string => v !== undefined)
                      : []
                  }
                  panoramas={
                    property.panoramas
                      ? property.panoramas.filter(
                          (p): p is import('@jf/shared-types').Panorama => p !== undefined,
                        )
                      : []
                  }
                  titulo={property.titulo[locale] ?? property.titulo.es}
                  locale={locale}
                />
              </div>

              <aside className={styles.sidebarColumn}>
                <PropertyStickySidebar property={property} locale={locale} />
                <PropertySpecs property={property} locale={locale} />
              </aside>
            </div>

            {property.descripcion && (
              <section className={styles.descriptionSection} aria-labelledby="description-title">
                <h2 id="description-title" className={styles.sectionTitle}>
                  {locale === 'es' ? 'Descripción' : 'Description'}
                </h2>
                <div className={styles.descriptionText}>
                  {property.descripcion[locale] ?? property.descripcion.es}
                </div>
              </section>
            )}

            <PropertyPOIs puntosInteres={property.puntosInteres ?? []} locale={locale} />
            <VideoFacade
              videos={
                property.videos ? property.videos.filter((v): v is string => v !== undefined) : []
              }
              locale={locale}
            />
            <PanoramaViewer
              panoramas={
                property.panoramas
                  ? property.panoramas.filter(
                      (p): p is import('@jf/shared-types').Panorama => p !== undefined,
                    )
                  : []
              }
              locale={locale}
            />

            {property.operacion === 'PROYECTO_SOBRE_PLANOS' && property.proyecto && (
              <section className={styles.projectSection} aria-labelledby="project-title">
                <h2 id="project-title" className={styles.sectionTitle}>
                  {locale === 'es' ? 'Información del Proyecto' : 'Project Information'}
                </h2>
                <dl className={styles.projectDetails}>
                  <div>
                    <dt>{locale === 'es' ? 'Etapa' : 'Stage'}</dt>
                    <dd>{property.proyecto.etapa[locale] ?? property.proyecto.etapa.es}</dd>
                  </div>
                  {property.proyecto.fechaEntregaEstimada && (
                    <div>
                      <dt>{locale === 'es' ? 'Entrega estimada' : 'Estimated delivery'}</dt>
                      <dd>{property.proyecto.fechaEntregaEstimada}</dd>
                    </div>
                  )}
                  {property.proyecto.unidadesDisponibles && (
                    <div>
                      <dt>{locale === 'es' ? 'Unidades disponibles' : 'Available units'}</dt>
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
                {locale === 'es' ? 'View in English' : 'Ver en español'}
              </a>
            </nav>
          </article>
        </main>
      </body>
    </html>
  );
}
