import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type NosotrosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  const otherLocale = locale === 'es' ? 'en' : 'es';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Nosotros' : 'About Us'}</h1>
      <p className="mt-2">
        {locale === 'es'
          ? 'Conoce más sobre JF Propiedad Raíz.'
          : 'Learn more about JF Propiedad Raíz.'}
      </p>
      <a href={`/${otherLocale}/about-us`} className="mt-4 inline-block text-blue-600 underline">
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
