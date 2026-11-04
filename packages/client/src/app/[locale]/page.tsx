import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getRoute } from '@/i18n/routes';
import { isLocale } from '@/i18n/config';
import Navbar from '@/components/Navbar';

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

  // Servicios para preview en portada (máx 3) - definidos inline con traducciones
  const servicesPreview = [
    {
      id: 'asesoria',
      titulo: locale === 'es' ? 'Asesoría Inmobiliaria' : 'Real Estate Advisory',
      descripcion:
        locale === 'es'
          ? 'Acompañamiento experto en compra, venta y alquiler de propiedades.'
          : 'Expert guidance in buying, selling, and renting properties.',
      icono: 'home',
    },
    {
      id: 'gestion',
      titulo: locale === 'es' ? 'Gestión de Proyectos' : 'Project Management',
      descripcion:
        locale === 'es'
          ? 'Supervisión y ejecución de proyectos de construcción y desarrollo.'
          : 'Supervision and execution of construction and development projects.',
      icono: 'building',
    },
    {
      id: 'avalúos',
      titulo: locale === 'es' ? 'Avalúos y Peritajes' : 'Appraisals & Expert Reports',
      descripcion:
        locale === 'es'
          ? 'Valoración técnica profesional de inmuebles para decisiones informadas.'
          : 'Professional technical valuation of properties for informed decisions.',
      icono: 'calculator',
    },
  ];

  const aboutExtract = tHome('aboutExtract');
  const aboutUrl = getRoute('about', locale);

  return (
    <div className={styles.page}>
      <Navbar locale={locale} />
      <main className={styles.main}>
        {/* HERO */}
        <section className={`${styles.section} ${styles.hero}`} aria-labelledby="hero-title">
          <div className={styles.heroBackground} aria-hidden="true">
            <svg
              viewBox="0 0 1200 600"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="1200"
              height="600"
            >
              <defs>
                <linearGradient
                  id="heroGradient"
                  x1="0"
                  y1="0"
                  x2="1200"
                  y2="600"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <rect width="1200" height="600" fill="url(#heroGradient)" />
              <circle cx="900" cy="150" r="200" fill="currentColor" fillOpacity="0.08" />
              <path
                d="M100 500 L300 300 L500 400 L700 200 L900 350 L1100 150"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                opacity="0.1"
              />
            </svg>
          </div>
          <div className={styles.heroContent}>
            <h1 id="hero-title" className={styles.heroTitle}>
              {t('home.title')}
            </h1>
            <p className={styles.heroSubtitle}>{t('home.intro')}</p>
            <nav
              className={styles.quickAccess}
              aria-label={locale === 'es' ? 'Accesos rápidos' : 'Quick access'}
            >
              <a href={getRoute('sale', locale)} className={styles.quickLink}>
                <svg
                  className={styles.quickLinkIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {t('nav.sale')}
              </a>
              <a href={getRoute('rent', locale)} className={styles.quickLink}>
                <svg
                  className={styles.quickLinkIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22v-10" />
                  <path d="M15 22v-10" />
                </svg>
                {t('nav.rent')}
              </a>
              <a href={getRoute('projects', locale)} className={styles.quickLink}>
                <svg
                  className={styles.quickLinkIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <path d="M9 22v-8l6-4 6 4v8" />
                  <path d="M12 14v8" />
                </svg>
                {t('nav.projects')}
              </a>
            </nav>
            <form
              className={styles.searchBar}
              role="search"
              aria-label={locale === 'es' ? 'Buscar propiedades' : 'Search properties'}
            >
              <div className={styles.searchForm}>
                <div className={styles.searchField}>
                  <label htmlFor="tipo" className={styles.searchLabel}>
                    {locale === 'es' ? 'Tipo de inmueble' : 'Property Type'}
                  </label>
                  <select id="tipo" className={styles.searchSelect}>
                    <option value="">{locale === 'es' ? 'Todos los tipos' : 'All Types'}</option>
                    <option value="CASA">{locale === 'es' ? 'Casa' : 'House'}</option>
                    <option value="APARTAMENTO">
                      {locale === 'es' ? 'Apartamento' : 'Apartment'}
                    </option>
                    <option value="LOTE_CAMPESTRE">
                      {locale === 'es' ? 'Lote Campestre' : 'Country Lot'}
                    </option>
                    <option value="LOTE_URBANO">
                      {locale === 'es' ? 'Lote Urbano' : 'Urban Lot'}
                    </option>
                    <option value="FINCA">{locale === 'es' ? 'Finca' : 'Farm'}</option>
                    <option value="LOCAL_COMERCIAL">
                      {locale === 'es' ? 'Local Comercial' : 'Commercial Space'}
                    </option>
                    <option value="BODEGA">{locale === 'es' ? 'Bodega' : 'Warehouse'}</option>
                    <option value="OFICINA">{locale === 'es' ? 'Oficina' : 'Office'}</option>
                  </select>
                </div>
                <div className={styles.searchField}>
                  <label htmlFor="ubicacion" className={styles.searchLabel}>
                    {locale === 'es' ? 'Ubicación' : 'Location'}
                  </label>
                  <select id="ubicacion" className={styles.searchSelect}>
                    <option value="">
                      {locale === 'es' ? 'Todas las ubicaciones' : 'All Locations'}
                    </option>
                    <option value="Antioquia,Medellín">
                      {locale === 'es' ? 'Medellín, Antioquia' : 'Medellín, Antioquia'}
                    </option>
                    <option value="Antioquia,Envigado">
                      {locale === 'es' ? 'Envigado, Antioquia' : 'Envigado, Antioquia'}
                    </option>
                    <option value="Antioquia,Itagüí">
                      {locale === 'es' ? 'Itagüí, Antioquia' : 'Itagüí, Antioquia'}
                    </option>
                    <option value="Antioquia,Bello">
                      {locale === 'es' ? 'Bello, Antioquia' : 'Bello, Antioquia'}
                    </option>
                    <option value="Antioquia,Sabaneta">
                      {locale === 'es' ? 'Sabaneta, Antioquia' : 'Sabaneta, Antioquia'}
                    </option>
                    <option value="Antioquia,Rionegro">
                      {locale === 'es' ? 'Rionegro, Antioquia' : 'Rionegro, Antioquia'}
                    </option>
                    <option value="Antioquia,Copacabana">
                      {locale === 'es' ? 'Copacabana, Antioquia' : 'Copacabana, Antioquia'}
                    </option>
                  </select>
                </div>
                <div className={styles.searchField}>
                  <label htmlFor="precio" className={styles.searchLabel}>
                    {locale === 'es' ? 'Precio máximo (COP)' : 'Max Price (COP)'}
                  </label>
                  <select id="precio" className={styles.searchSelect}>
                    <option value="">{locale === 'es' ? 'Sin límite' : 'No Limit'}</option>
                    <option value="200000000">
                      {locale === 'es' ? '$ 200.000.000' : '$ 200.000.000'}
                    </option>
                    <option value="400000000">
                      {locale === 'es' ? '$ 400.000.000' : '$ 400.000.000'}
                    </option>
                    <option value="600000000">
                      {locale === 'es' ? '$ 600.000.000' : '$ 600.000.000'}
                    </option>
                    <option value="800000000">
                      {locale === 'es' ? '$ 800.000.000' : '$ 800.000.000'}
                    </option>
                    <option value="1000000000">
                      {locale === 'es' ? '$ 1.000.000.000' : '$ 1.000.000.000'}
                    </option>
                    <option value="2000000000">
                      {locale === 'es' ? '$ 2.000.000.000+' : '$ 2.000.000.000+'}
                    </option>
                  </select>
                </div>
                <button type="submit" className={styles.searchButton}>
                  {t('search.filters') === 'Filtros'
                    ? locale === 'es'
                      ? 'Buscar'
                      : 'Search'
                    : t('search.filters')}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* DESTACADAS */}
        <section
          className={`${styles.section} ${styles.featuredSection}`}
          aria-labelledby="featured-title"
        >
          <header className={styles.sectionHeader}>
            <h2 id="featured-title" className={styles.sectionTitle}>
              {t('home.featured')}
            </h2>
            <p className={styles.sectionSubtitle}>
              {locale === 'es'
                ? 'Las mejores oportunidades seleccionadas por nuestro equipo'
                : 'The best opportunities selected by our team'}
            </p>
          </header>
          <div className={styles.featuredGrid} role="list">
            {/* Placeholder para PropertyGrid - se reemplazará con el componente real cuando MT2.2 esté listo */}
            {Array.from({ length: 4 }).map((_, i) => (
              <article key={i} className={styles.featuredCard} role="listitem">
                <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-4" aria-hidden="true" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">Venta</span>
                  <span className="text-xs text-gray-400">JF-000{i + 1}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Propiedad Destacada {i + 1}
                </h3>
                <p className="text-2xl font-bold text-green-600 mb-3">$ 450.000.000</p>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-3">
                  <span>📍 Medellín, Antioquia</span>
                  <span>3 hab.</span>
                  <span>2 baños</span>
                  <span>120 m²</span>
                </div>
                <a
                  href="#"
                  className="block w-full text-center py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  {t('property.details')}
                </a>
              </article>
            ))}
          </div>
          <footer className={styles.sectionFooter}>
            <a href={getRoute('sale', locale)} className={styles.sectionLink}>
              {locale === 'es'
                ? 'Ver todas las propiedades en venta'
                : 'View all properties for sale'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
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
            <p className={styles.sectionSubtitle}>
              {locale === 'es'
                ? 'Soluciones integrales para tus proyectos inmobiliarios y de ingeniería'
                : 'Comprehensive solutions for your real estate and engineering projects'}
            </p>
          </header>
          <div className={styles.servicesGrid} role="list">
            {servicesPreview.map((service) => (
              <article key={service.id} className={styles.serviceCard} role="listitem">
                <div className={styles.serviceIcon} aria-hidden="true">
                  {service.icono === 'home' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="48"
                      height="48"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )}
                  {service.icono === 'building' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="48"
                      height="48"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <path d="M9 22v-8l6-4 6 4v8" />
                      <path d="M12 14v8" />
                    </svg>
                  )}
                  {service.icono === 'calculator' && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      width="48"
                      height="48"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M9 9h6v6H9z" />
                      <path d="M9 15h6" />
                    </svg>
                  )}
                </div>
                <h3 className={styles.serviceTitle}>{service.titulo}</h3>
                <p className={styles.serviceDescription}>{service.descripcion}</p>
                <a href={getRoute('services', locale)} className={styles.serviceLink}>
                  {locale === 'es' ? 'Conocer más' : 'Learn more'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </article>
            ))}
          </div>
          <footer className={styles.sectionFooter}>
            <a href={getRoute('contact', locale)} className={styles.aboutLink}>
              {locale === 'es'
                ? 'Ver todos los servicios y contactarnos'
                : 'View all services and contact us'}
            </a>
          </footer>
        </section>

        {/* NOSOTROS */}
        <section className={`${styles.section} ${styles.aboutBlock}`} aria-labelledby="about-title">
          <div className={styles.aboutContent}>
            <h2 id="about-title" className={styles.aboutTitle}>
              {t('nav.about')}
            </h2>
            <p className={styles.aboutExtract}>{aboutExtract}</p>
            <a href={aboutUrl} className={styles.aboutLink}>
              {locale === 'es' ? 'Conocer más' : 'Learn more'}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className={styles.aboutImage} aria-hidden="true">
            <svg
              viewBox="0 0 600 450"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="600"
              height="450"
            >
              <rect width="600" height="450" fill="var(--color-piedra-clara)" />
              <circle cx="300" cy="225" r="80" fill="var(--color-verde-bosque)" fillOpacity="0.1" />
              <path
                d="M220 300 L300 220 L380 300"
                stroke="var(--color-verde-bosque)"
                strokeWidth="3"
                fill="none"
                opacity="0.3"
              />
              <path
                d="M220 350 L300 270 L380 350"
                stroke="var(--color-verde-bosque)"
                strokeWidth="2"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M220 400 L300 320 L380 400"
                stroke="var(--color-verde-bosque)"
                strokeWidth="1.5"
                fill="none"
                opacity="0.15"
              />
              <text
                x="300"
                y="225"
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="system-ui"
                fontSize="14"
                fill="var(--color-grafito)"
                opacity="0.5"
              >
                {locale === 'es'
                  ? 'Imagen de nuestras oficinas en Rionegro'
                  : 'Image of our offices in Rionegro'}
              </text>
            </svg>
          </div>
        </section>

        {/* ALIADOS */}
        <section
          className={`${styles.section} ${styles.partnersSection}`}
          aria-labelledby="partners-title"
        >
          <header className={styles.sectionHeader}>
            <h2 id="partners-title" className={styles.sectionTitle}>
              {locale === 'es' ? 'Empresas Aliadas' : 'Partner Companies'}
            </h2>
            <p className={styles.sectionSubtitle}>
              {locale === 'es'
                ? 'Trabajamos con las mejores marcas para garantizar calidad en cada proyecto'
                : 'We work with the best brands to guarantee quality in every project'}
            </p>
          </header>
          <div
            className={styles.partnersGrid}
            role="list"
            aria-label={locale === 'es' ? 'Logos de empresas aliadas' : 'Partner company logos'}
          >
            {['Coninsa', 'Colpatria', 'Bancolombia', 'Davivienda', 'Coomeva', 'Sura'].map(
              (name) => (
                <div key={name} className={styles.partnerLogo} role="listitem" aria-label={name}>
                  <svg
                    viewBox="0 0 180 60"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    width="180"
                    height="60"
                  >
                    <text
                      x="90"
                      y="35"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontFamily="system-ui"
                      fontSize="18"
                      fontWeight="600"
                      fill="var(--color-tinta)"
                      opacity="0.6"
                    >
                      {name}
                    </text>
                  </svg>
                </div>
              ),
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
