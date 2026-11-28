import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AboutView } from '@/components/about/AboutView';
import { isLocale } from '@/i18n/config';
import { buildAboutMetadata } from '@/lib/about-seo';
import { fetchAboutServer, type AboutData } from '@/server/about';

type NosotrosPageProps = {
  params: Promise<{ locale: string }>;
};

/**
 * Lee el documento una sola vez por petición (los metadatos y la página lo comparten). Si falla, el
 * error se registra y se avisa con un estado propio; no se confunde con «sin contenido».
 */
const leerAbout = cache(async (): Promise<{ about: AboutData | null; noDisponible: boolean }> => {
  try {
    return { about: await fetchAboutServer(), noDisponible: false };
  } catch (error) {
    console.error('[nosotros] No se pudo cargar el documento:', error);
    return { about: null, noDisponible: true };
  }
});

export async function generateMetadata({ params }: NosotrosPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  // El contenido sale del backend en cada visita: la página es dinámica a propósito.
  await connection();
  const [t, { about }] = await Promise.all([
    getTranslations({ locale, namespace: 'about' }),
    leerAbout(),
  ]);
  return buildAboutMetadata({ about, locale, tituloRespaldo: t('title') });
}

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  await connection();
  const { about, noDisponible } = await leerAbout();

  return <AboutView about={about} locale={locale} noDisponible={noDisponible} />;
}
