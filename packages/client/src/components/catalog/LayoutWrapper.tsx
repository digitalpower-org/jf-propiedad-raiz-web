'use client';

import NavbarClient from '@/components/catalog/NavbarClient';
import Footer from '@/components/Footer';
import type { Locale } from '@/i18n/config';

export default function LayoutWrapper({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <>
      <NavbarClient locale={locale} />
      {children}
      <Footer locale={locale} />
    </>
  );
}
