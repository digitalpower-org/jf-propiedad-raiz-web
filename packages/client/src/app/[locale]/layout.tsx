import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';

import { AuthProvider } from './AuthProvider';
import { isLocale, locales } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';

const theme = createTheme({
  primaryColor: 'green',
  // Los tokens de diseño detallados en DESIGN-SYSTEM.md se pueden extender aquí
});

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams(): { locale: string }[] {
  return locales.map((locale) => ({ locale }));
}

/** Un idioma no soportado (`/fr/...`) responde 404 (AC0.4.2). */
export const dynamicParams = false;

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('title') };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // Habilita el render estático y fija el idioma para las APIs de next-intl.
  setRequestLocale(locale);

  // Solo el diccionario del idioma activo llega al navegador (AC7.2.4).
  const messages = await loadMessages(locale);

  return (
    <html lang={locale}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Bogota">
            <MantineProvider theme={theme}>{children}</MantineProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
