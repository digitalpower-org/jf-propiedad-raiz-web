import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type PoliticaPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PoliticaPage({ params }: PoliticaPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">
        {locale === 'es' ? 'Política de tratamiento de datos' : 'Data Processing Policy'}
      </h1>
      <p className="mt-2">
        {locale === 'es' ? 'Tratamiento de datos personales.' : 'Personal data processing.'}
      </p>
      <a
        href={
          locale === 'es' ? '/en/data-processing-policy' : '/es/politica-de-tratamiento-de-datos'
        }
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
