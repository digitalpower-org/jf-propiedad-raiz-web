'use client';

import { useState } from 'react';
import { getRoute, type RouteKey } from '@/i18n/routes';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getWhatsAppNumber, BRAND_NAME, buildWhatsAppUrl } from '@/lib/whatsapp';
import { MobileMenu } from '@/components/MobileMenu';

import styles from './Navbar.module.css';

type NavbarLink = {
  readonly key: RouteKey;
  readonly label: { readonly es: string; readonly en: string };
};

type NavbarProps = {
  readonly locale: Locale;
};

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('navbar');
  const whatsappNumber = getWhatsAppNumber();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!whatsappNumber) return;
    const url = buildWhatsAppUrl({
      number: whatsappNumber,
      message: t('whatsappMessage'),
    });
    e.currentTarget.href = url;
  };

  const links: NavbarLink[] = [
    { key: 'home', label: { es: 'Inicio', en: 'Home' } },
    { key: 'sale', label: { es: 'Venta', en: 'For Sale' } },
    { key: 'rent', label: { es: 'Alquiler', en: 'For Rent' } },
    { key: 'projects', label: { es: 'Proyectos', en: 'Projects' } },
    { key: 'services', label: { es: 'Servicios', en: 'Services' } },
    { key: 'about', label: { es: 'Nosotros', en: 'About Us' } },
    { key: 'contact', label: { es: 'Contacto', en: 'Contact' } },
    { key: 'consign', label: { es: 'Consignar', en: 'List Your Property' } },
  ];

  return (
    <nav className={styles.navbar}>
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        locale={locale}
      />
      <div className={styles.navbarContainer}>
        <div className={styles.navbarLeft}>
          <a href={getRoute('home', locale)} className={styles.navbarLogo}>
            {BRAND_NAME}
          </a>
        </div>

        <div className={styles.navbarRight}>
          <div className={styles.navbarLinks}>
            {links.map((link) => {
              const href = getRoute(link.key, locale as 'es' | 'en');
              const isHome = link.key === 'home';
              return (
                <a
                  key={link.key}
                  href={href}
                  className={`
                    ${styles.navbarLink}
                    ${isHome ? styles.navbarLinkActive : ''}
                  `}
                >
                  {link.label.es === link.label.en
                    ? link.label.es
                    : locale === 'es'
                      ? link.label.es
                      : link.label.en}
                </a>
              );
            })}
          </div>

          <LanguageSwitcher locale={locale} className={styles.languageSwitcher} />

          {whatsappNumber && (
            <a
              href={buildWhatsAppUrl({
                number: whatsappNumber,
                message: t('whatsappMessage'),
              })}
              className={styles.whatsappButton}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('whatsapp')}
              onClick={handleWhatsAppClick}
            >
              <span className={styles.whatsappIcon}>📱</span>
              {t('whatsapp')}
            </a>
          )}

          <button
            className={styles.mobileMenuButton}
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label={t('menuOpen')}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            type="button"
          >
            <span className={styles.mobileMenuIcon} aria-hidden="true">☰</span>
          </button>
        </div>
      </div>
    </nav>
  );
}