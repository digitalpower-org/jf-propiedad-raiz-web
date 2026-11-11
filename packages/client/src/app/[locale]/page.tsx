import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import { HeroSearchForm } from '@/components/catalog/HeroSearchForm';

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
  const servicesPreview = messages.home.servicesPreview;

  const aboutExtract = tHome('aboutExtract');
  const aboutUrl = getRoute('about', locale);

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
        <section className={styles.featuredSection} aria-labelledby="featured-title">
          <header className={styles.sectionHeader}>
            <h2 id="featured-title" className={styles.sectionTitle}>
              {t('home.featured')}
            </h2>
            <p className={styles.sectionSubtitle}>{tHome('featuredSubtitle')}</p>
          </header>
          <div className={styles.featuredGrid} role="list">
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className={styles.featuredCard} role="listitem">
                <div className={styles.featuredImage} aria-hidden="true" />
                <div className={styles.featuredBadge}>{tHome('operation')}</div>
                <h3 className={styles.featuredTitle}>
                  {tHome('featuredCardTitle', { index: i + 1 })}
                </h3>
                <p className={styles.featuredPrice}>$ 450.000.000</p>
                <div className={styles.featuredSpecs}>
                  <span>{tHome('featuredCardLocation')}</span>
                  <span>{tHome('featuredCardBedrooms', { count: 3 })}</span>
                  <span>{tHome('featuredCardBathrooms', { count: 2 })}</span>
                  <span>{tHome('featuredCardArea', { area: '120' })}</span>
                </div>
                <a href="#" className={styles.featuredLink}>
                  {t('property.details')}
                </a>
              </article>
            ))}
          </div>
          <footer className={styles.sectionFooter}>
            <a href={getRoute('sale', locale)} className={styles.sectionLink}>
              {tHome('viewAllSale')}
              <span className={styles.arrow}>→</span>
            </a>
          </footer>
        </section>

        {/* SERVICIOS PREVIEW */}
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
            {servicesPreview.map(
              (service: { id: string; title: string; description: string; icon: string }) => (
                <article key={service.id} className={styles.serviceCard} role="listitem">
                  <div className={styles.serviceIcon} aria-hidden="true">
                    {service.icon === 'home' && <span className={styles.iconHome}>🏠</span>}
                    {service.icon === 'building' && <span className={styles.iconBuilding}>🏗️</span>}
                    {service.icon === 'calculator' && (
                      <span className={styles.iconCalculator}>🧮</span>
                    )}
                  </div>
                  <h3 className={styles.serviceTitle}>{service.title}</h3>
                  <p className={styles.serviceDescription}>{service.description}</p>
                  <a href={getRoute('services', locale)} className={styles.serviceLink}>
                    {tHome('learnMore')}
                    <span className={styles.arrow}>→</span>
                  </a>
                </article>
              ),
            )}
          </div>
          <footer className={styles.sectionFooter}>
            <a href={getRoute('contact', locale)} className={styles.aboutLink}>
              {tHome('viewAllServicesContact')}
              <span className={styles.arrow}>→</span>
            </a>
          </footer>
        </section>

        {/* NOSOTROS */}
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
          <div className={styles.aboutImage} aria-hidden="true">
            <div className={styles.aboutImagePlaceholder} />
            <span className={styles.aboutImageAlt}>{tHome('aboutImageAlt')}</span>
          </div>
        </section>

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
