import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { setRequestLocale } from 'next-intl/server';
import { AboutView } from '@/components/about/AboutView';
import { isLocale } from '@/i18n/config';
import { fetchAboutServer, type AboutData } from '@/server/about';

type NosotrosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  // El contenido sale del backend en cada visita: la página es dinámica a propósito.
  await connection();

  let about: AboutData | null = null;
  let noDisponible = false;
  try {
    about = await fetchAboutServer();
  } catch (error) {
    // Como la portada: el fallo se registra y la página avisa; no se confunde con «sin contenido».
    noDisponible = true;
    console.error('[nosotros] No se pudo cargar el documento:', error);
  }

  return <AboutView about={about} locale={locale} noDisponible={noDisponible} />;
}
