import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import type { PropertyCard } from '@jf/shared-types';
import { HeroSearchForm } from '@/components/catalog/HeroSearchForm';
import { PropertyCardComponent } from '@/components/catalog/PropertyCard';
import { fetchFeaturedPropertiesServer } from '@/server/featured-properties';
import { fetchServicesPreviewServer, type ServicePreview } from '@/server/services-preview';
import { fetchAboutExtractServer } from '@/server/about-extract';

import styles from './page.module.css';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();
  const tHome = await getTranslations('home');
  const messages = await loadMessages(locale);

  const aboutUrl = getRoute('about', locale);

  let featured: PropertyCard[] = [];
  try {
    featured = await fetchFeaturedPropertiesServer();
  } catch (error) {
    console.error('[home] No se pudieron cargar las destacadas:', error);
  }

  let services: ServicePreview[] = [];
  try {
    services = await fetchServicesPreviewServer();
  } catch (error) {
    console.error('[home] No se pudieron cargar los servicios:', error);
  }

  let aboutExtract: string | null = null;
  try {
    aboutExtract = await fetchAboutExtractServer(locale);
  } catch (error) {
    console.error('[home] No se pudo cargar el extracto de Nosotros:', error);
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* HERO */}
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroBackground} aria-hidden="true">
            <img
              className={styles.heroImage}
              src="/images/hero-default.jpg"
              alt="Inmueble en el Valle de Aburrá"
              width="1200"
              height="600"
              loading="eager"
            />
            <div className={styles.heroOverlay} />
          </div>
          <div className={styles.heroContent}>
            <h1 id="hero-title" className={styles.heroTitle}>
              {t('home.title')}
            </h1>
            <p className={styles.heroSubtitle}>{t('home.intro')}</p>
            <nav className={styles.quickAccess} aria-label={tHome('quickAccessAriaLabel')}>
              <a href={getRoute('sale', locale)} className={styles.quickLink}>
                <span className={styles.quickLinkIcon}>🏠</span>
                {t('nav.sale')}
              </a>
              <a href={getRoute('rent', locale)} className={styles.quickLink}>
                <span className={styles.quickLinkIcon}>🏘️</span>
                {t('nav.rent')}
              </a>
              <a href={getRoute('projects', locale)} className={styles.quickLink}>
                <span className={styles.quickLinkIcon}>🏗️</span>
                {t('nav.projects')}
              </a>
            </nav>
            <Suspense fallback={<div className={styles.searchFallback} />}>
              <HeroSearchForm locale={locale} />
            </Suspense>
          </div>
        </section>

        {/* DESTACADAS */}
        {featured.length > 0 && (
          <section className={styles.featuredSection} aria-labelledby="featured-title">
            <header className={styles.sectionHeader}>
              <h2 id="featured-title" className={styles.sectionTitle}>
                {t('home.featured')}
              </h2>
              <p className={styles.sectionSubtitle}>{tHome('featuredSubtitle')}</p>
            </header>
            <div className={styles.featuredGrid}>
              {featured.map((property) => (
                <PropertyCardComponent key={property.id} property={property} locale={locale} />
              ))}
            </div>
            <footer className={styles.sectionFooter}>
              <a href={getRoute('sale', locale)} className={styles.sectionLink}>
                {tHome('viewAllSale')}
                <span className={styles.arrow}>→</span>
              </a>
            </footer>
          </section>
        )}

        {/* SERVICIOS PREVIEW */}
        {services.length > 0 && (
          <section
            className={`${styles.section} ${styles.servicesPreview}`}
            aria-labelledby="services-title"
          >
            <header className={styles.sectionHeader}>
              <h2 id="services-title" className={styles.sectionTitle}>
                {t('nav.services')}
              </h2>
              <p className={styles.sectionSubtitle}>{tHome('servicesPreviewSubtitle')}</p>
            </header>
            <div className={styles.servicesGrid} role="list">
              {services.map((service) => {
                const resumen = service.resumen?.[locale] ?? service.resumen?.es;
                return (
                  <article key={service.slug} className={styles.serviceCard} role="listitem">
                    <h3 className={styles.serviceTitle}>
                      {service.titulo[locale] ?? service.titulo.es ?? ''}
                    </h3>
                    {resumen && <p className={styles.serviceDescription}>{resumen}</p>}
                    <a
                      href={getRoute('serviceDetail', locale, { slug: service.slug })}
                      className={styles.serviceLink}
                    >
                      {tHome('learnMore')}
                      <span className={styles.arrow}>→</span>
                    </a>
                  </article>
                );
              })}
            </div>
            <footer className={styles.sectionFooter}>
              <a href={getRoute('contact', locale)} className={styles.aboutLink}>
                {tHome('viewAllServicesContact')}
                <span className={styles.arrow}>→</span>
              </a>
            </footer>
          </section>
        )}

        {/* NOSOTROS */}
        {aboutExtract && (
          <section className={styles.aboutBlock} aria-labelledby="about-title">
            <div className={styles.aboutContent}>
              <h2 id="about-title" className={styles.aboutTitle}>
                {t('nav.about')}
              </h2>
              <p className={styles.aboutExtract}>{aboutExtract}</p>
              <a href={aboutUrl} className={styles.aboutLink}>
                {tHome('learnMore')}
                <span className={styles.arrow}>→</span>
              </a>
            </div>
          </section>
        )}

        {/* ALIADOS */}
        <section className={styles.partnersSection} aria-labelledby="partners-title">
          <header className={styles.sectionHeader}>
            <h2 id="partners-title" className={styles.sectionTitle}>
              {tHome('partnersTitle')}
            </h2>
            <p className={styles.sectionSubtitle}>{tHome('partnersSubtitle')}</p>
          </header>
          <div className={styles.partnersGrid} role="list" aria-label={tHome('partnersAriaLabel')}>
            {(messages.home.partners as unknown as string[]).map((name: string) => (
              <div key={name} className={styles.partnerLogo} role="listitem" aria-label={name}>
                {name}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
