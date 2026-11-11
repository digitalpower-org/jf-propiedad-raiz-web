'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getEquivalentPath, routes } from '@/i18n/routes';
import type { Locale } from '@/i18n/config';

interface LanguageSwitcherProps {
  readonly locale: Locale;
  readonly className?: string | undefined;
  readonly 'aria-label'?: string | undefined;
}

function LanguageSwitcherFallback({ targetLocale }: { targetLocale: Locale }) {
  return (
    <span className="opacity-50" aria-hidden="true">
      🌐
    </span>
  );
}

function LanguageSwitcherInner({
  locale,
  className,
  'aria-label': ariaLabel,
}: LanguageSwitcherProps) {
  const t = useTranslations('localeSwitcher');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const targetLocale = locale === 'es' ? 'en' : 'es';

  return (
    <Link
      href={getEquivalentPath(pathname, search, targetLocale)}
      className={className ?? ''}
      aria-label={ariaLabel ?? t('switchTo')}
    >
      <span className="inline-block" aria-hidden="true">
        🌐
      </span>
      <span>{t('switchTo')}</span>
    </Link>
  );
}

export function LanguageSwitcher({
  locale,
  className,
  'aria-label': ariaLabel,
}: LanguageSwitcherProps) {
  const targetLocale = locale === 'es' ? 'en' : 'es';

  return (
    <Suspense fallback={<LanguageSwitcherFallback targetLocale={targetLocale} />}>
      <LanguageSwitcherInner locale={locale} className={className} aria-label={ariaLabel} />
    </Suspense>
  );
}
