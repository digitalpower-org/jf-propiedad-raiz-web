'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';
import { getRoute } from '@/i18n/routes';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getWhatsAppNumber, BRAND_NAME, buildWhatsAppUrl } from '@/lib/whatsapp';

import styles from './Footer.module.css';

const NAV_LINKS: { readonly key: string; readonly labelKey: string }[] = [
  { key: 'sale', labelKey: 'nav.sale' },
  { key: 'rent', labelKey: 'nav.rent' },
  { key: 'projects', labelKey: 'nav.projects' },
  { key: 'services', labelKey: 'nav.services' },
  { key: 'about', labelKey: 'nav.about' },
  { key: 'contact', labelKey: 'nav.contact' },
  { key: 'consign', labelKey: 'nav.consign' },
];

const LEGAL_LINKS: { readonly key: string; readonly labelKey: string }[] = [
  { key: 'privacy', labelKey: 'footer.legal.privacy' },
  { key: 'dataPolicy', labelKey: 'footer.legal.dataPolicy' },
  { key: 'terms', labelKey: 'footer.legal.terms' },
];

export default function Footer({ locale }: { readonly locale: Locale }) {
  const t = useTranslations();
  const whatsappNumber = getWhatsAppNumber();

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!whatsappNumber) return;
    const url = buildWhatsAppUrl({
      number: whatsappNumber,
      message: t('footer.whatsappMessage'),
    });
    e.currentTarget.href = url;
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.logoSection}>
            <div className={styles.logoText}>{BRAND_NAME}</div>
            <p className={styles.logoSubtitle}>{t('footer.companySubtitle')}</p>
          </div>

          <div className={styles.navSection}>
            <h3 className={styles.sectionTitle}>{t('footer.navigation')}</h3>
            <ul className={styles.linkList}>
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <Link href={getRoute(link.key as never, locale)} className={styles.link}>
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.contactSection}>
            <h3 className={styles.sectionTitle}>{t('footer.contact')}</h3>
            <p className={styles.contactText}>{t('footer.contactLabel')}</p>
            <p className={styles.contactText}>{t('footer.contactEmailPlaceholder')}</p>
          </div>

          <div className={styles.whatsappSection}>
            <h3 className={styles.sectionTitle}>{t('footer.whatsapp')}</h3>
            {whatsappNumber && (
              <a
                href={buildWhatsAppUrl({
                  number: whatsappNumber,
                  message: t('footer.whatsappMessage'),
                })}
                className={styles.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('footer.whatsapp')}
                onClick={handleWhatsAppClick}
              >
                <span className={styles.whatsappIcon}>📱</span>
                {t('footer.whatsapp')}
              </a>
            )}
          </div>

          <div className={styles.languageSection}>
            <h3 className={styles.sectionTitle}>{t('footer.language')}</h3>
            <LanguageSwitcher locale={locale} className={styles.languageLink} />
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
          <div className={styles.legalLinks}>
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.key}
                href={getRoute(link.key as never, locale)}
                className={styles.legalLink}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}