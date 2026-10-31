import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type PropiedadDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PropiedadDetailPage({ params }: PropiedadDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Inmueble' : 'Property'}</h1>
      <p className="mt-2">
        {locale === 'es' ? `Detalle del inmueble: ${slug}` : `Property detail: ${slug}`}
      </p>
      <a
        href={locale === 'es' ? `/en/property/${slug}` : `/es/propiedad/${slug}`}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
