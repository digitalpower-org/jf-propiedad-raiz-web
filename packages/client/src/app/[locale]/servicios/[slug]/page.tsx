import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type ServicioDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ServicioDetailPage({ params }: ServicioDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Servicio' : 'Service'}</h1>
      <p className="mt-2">
        {locale === 'es' ? `Detalle del servicio: ${slug}` : `Service detail: ${slug}`}
      </p>
      <a
        href={`/${otherLocale}/services/${slug}`}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
