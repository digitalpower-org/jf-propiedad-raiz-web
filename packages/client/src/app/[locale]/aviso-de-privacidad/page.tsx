import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type PrivacidadPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacidadPage({ params }: PrivacidadPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">
        {locale === 'es' ? 'Aviso de privacidad' : 'Privacy Notice'}
      </h1>
      <p className="mt-2">
        {locale === 'es'
          ? 'Política de privacidad de JF Propiedad Raíz.'
          : 'Privacy policy of JF Propiedad Raíz.'}
      </p>
      <a
        href={locale === 'es' ? '/en/privacy-notice' : '/es/aviso-de-privacidad'}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
