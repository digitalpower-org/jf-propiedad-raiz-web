'use client';

import Navbar from '@/components/Navbar';
import type { Locale } from '@/i18n/config';

export default function NavbarClient({ locale }: { locale: Locale }) {
  return <Navbar locale={locale} />;
}
