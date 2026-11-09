import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type ServiciosPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ServiciosPage({ params }: ServiciosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{locale === 'es' ? 'Servicios' : 'Services'}</h1>
          <p className={styles.subtitle}>
            {locale === 'es'
              ? 'Nuestros servicios inmobiliarios.'
              : 'Our real estate services.'}
          </p>
        </div>

        <div className={styles.emptyState}>
          <p className={styles.emptyText}>
            {locale === 'es'
              ? 'Próximamente: catálogo de servicios disponibles.'
              : 'Coming soon: catalog of available services.'}
          </p>
        </div>
      </div>
    </div>
  );
}
