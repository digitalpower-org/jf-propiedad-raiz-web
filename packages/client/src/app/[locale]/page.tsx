import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';
import Navbar from '@/components/Navbar';

import styles from './page.module.css';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Los layouts y las páginas se renderizan en paralelo: cada uno debe fijar
  // su idioma antes de pedir traducciones, si no el request config cae en el
  // idioma por defecto.
  setRequestLocale(locale);

  const t = await getTranslations();

  return (
    <div className={styles.page}>
      <Navbar locale={locale} />
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1>{t('home.title')}</h1>
          <p>{t('home.intro')}</p>
        </div>
      </main>
    </div>
  );
}
