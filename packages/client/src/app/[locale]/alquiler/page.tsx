import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { CatalogoServidor } from '@/components/catalog/CatalogoServidor';

import styles from './page.module.css';

type CatalogoPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AlquilerPage({ params, searchParams }: CatalogoPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('rent.title')}</h1>
          <p className={styles.subtitle}>{t('rent.empty')}</p>
        </div>

        <Suspense fallback={<div className="h-[400px] animate-pulse" />}>
          <CatalogoServidor operacion="ALQUILER" locale={locale} searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
