import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isLocale } from '@/i18n/config';

type ContactoPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactoPage({ params }: ContactoPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">{locale === 'es' ? 'Contacto' : 'Contact'}</h1>
      <p className="mt-2">
        {locale === 'es' ? 'Escríbanos para más información.' : 'Write to us for more information.'}
      </p>
      <a
        href={locale === 'es' ? '/en/contact' : '/es/contacto'}
        className="mt-4 inline-block text-blue-600 underline"
      >
        {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
      </a>
    </div>
  );
}
