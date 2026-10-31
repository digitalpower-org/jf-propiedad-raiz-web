import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type VentaPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function VentaPage({ params }: VentaPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Venta' : 'For Sale'}</h1>
      <p className="mt-2">{locale === 'es' ? 'Inmuebles en venta.' : 'Properties for sale.'}</p>
      <a href={`/${otherLocale}/sale`} className="mt-4 inline-block text-blue-600 underline">
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
