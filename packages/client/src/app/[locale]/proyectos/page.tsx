import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type ProyectosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ProyectosPage({ params }: ProyectosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Proyectos' : 'Projects'}</h1>
      <p className="mt-2">{locale === 'es' ? 'Inmuebles sobre planos.' : 'Off-plan properties.'}</p>
      <a href={`/${otherLocale}/projects`} className="mt-4 inline-block text-blue-600 underline">
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
