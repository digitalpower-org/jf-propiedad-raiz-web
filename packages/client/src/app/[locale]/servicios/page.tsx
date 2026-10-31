import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type ServiciosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ServiciosPage({ params }: ServiciosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Servicios' : 'Services'}</h1>
      <p className="mt-2">
        {locale === 'es' ? 'Nuestros servicios inmobiliarios.' : 'Our real estate services.'}
      </p>
      <a href={`/${otherLocale}/services`} className="mt-4 inline-block text-blue-600 underline">
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
