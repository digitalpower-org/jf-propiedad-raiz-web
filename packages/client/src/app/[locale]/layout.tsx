import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';
import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';

import '../globals.css';
import { AuthProvider } from './AuthProvider';
import { isLocale, locales, type Locale } from '@/i18n/config';
import { loadMessages } from '@/i18n/messages';
import LayoutWrapper from '@/components/catalog/LayoutWrapper';

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-regola',
});

const theme = createTheme({
  primaryColor: 'myGreen',
  fontFamily: plusJakartaSans.style.fontFamily ?? 'Plus Jakarta Sans, sans-serif',
  colors: {
    myGreen: [
      '#f7f9f8',
      '#e9f2ec',
      '#d0e6da',
      '#b7dac9',
      '#9eceb7',
      '#5a9a7c',
      '#336650',
      '#2d5a48',
      '#277730',
      '#1e5a26',
    ],
  },
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
    <html lang={locale} className={plusJakartaSans.className} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ColorSchemeScript />
      </head>
      <body>
        <AuthProvider>
          <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Bogota">
            <MantineProvider theme={theme}>
              <LayoutWrapper locale={locale}>
                {children}
              </LayoutWrapper>
            </MantineProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
