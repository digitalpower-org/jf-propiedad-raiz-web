import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type TerminosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TerminosPage({ params }: TerminosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Términos' : 'Terms'}</h1>
      <p className="mt-2">
        {locale === 'es' ? 'Términos y condiciones de uso.' : 'Terms and conditions of use.'}
      </p>
      <a
        href={locale === 'es' ? '/en/terms' : '/es/terminos'}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
