import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type ConsignPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ConsignPage({ params }: ConsignPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">
        {locale === 'es' ? 'Consigne su propiedad' : 'List Your Property'}
      </h1>
      <p className="mt-2">
        {locale === 'es'
          ? 'Publique su inmueble en nuestro catálogo.'
          : 'List your property in our catalog.'}
      </p>
      <a
        href={`/${otherLocale}/list-your-property`}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
