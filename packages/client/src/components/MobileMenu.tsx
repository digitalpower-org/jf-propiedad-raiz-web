'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { RouteKey } from '@/i18n/routes';
import { getRoute } from '@/i18n/routes';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { getWhatsAppNumber, BRAND_NAME, buildWhatsAppUrl } from '@/lib/whatsapp';
import Link from 'next/link';

import styles from './MobileMenu.module.css';

type MobileMenuProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly locale: 'es' | 'en';
};

const links: {
  readonly key: RouteKey;
  readonly label: { readonly es: string; readonly en: string };
}[] = [
  { key: 'home', label: { es: 'Inicio', en: 'Home' } },
  { key: 'sale', label: { es: 'Venta', en: 'For Sale' } },
  { key: 'rent', label: { es: 'Alquiler', en: 'For Rent' } },
  { key: 'projects', label: { es: 'Proyectos', en: 'Projects' } },
  { key: 'services', label: { es: 'Servicios', en: 'Services' } },
  { key: 'about', label: { es: 'Nosotros', en: 'About Us' } },
  { key: 'contact', label: { es: 'Contacto', en: 'Contact' } },
  { key: 'consign', label: { es: 'Consignar', en: 'List Your Property' } },
];

export function MobileMenu({ isOpen, onClose, locale }: MobileMenuProps) {
  const t = useTranslations('navbar');
  const whatsappNumber = getWhatsAppNumber();
  const menuRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    const menuElement = menuRef.current;
    if (!menuElement) return;

    // Focus the first focusable element (close button)
    const focusableElements = menuElement.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Focus the close button initially
    const closeButton = menuElement.querySelector('[data-mobile-menu-close]') as HTMLElement;
    closeButton?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus to the element that opened the menu
      previousActiveElement.current?.focus();
    };
  }, [isOpen, onClose]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!whatsappNumber) return;
    const url = buildWhatsAppUrl({
      number: whatsappNumber,
      message: t('whatsappMessage'),
    });
    e.currentTarget.href = url;
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-menu-title"
      ref={menuRef}
    >
      <div className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h2 id="mobile-menu-title" className={styles.drawerTitle}>
            {BRAND_NAME}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('menuClose')}
            data-mobile-menu-close
            type="button"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <nav className={styles.drawerNav} aria-label={t('menuOpen')}>
          <ul className={styles.drawerLinks}>
            {links.map((link) => {
              const href = getRoute(link.key, locale);
              const isHome = link.key === 'home';
              return (
                <li key={link.key} className={styles.drawerLinkItem}>
                  <Link
                    href={href}
                    className={`${styles.drawerLink} ${isHome ? styles.drawerLinkActive : ''}`}
                    onClick={onClose}
                  >
                    {link.label.es === link.label.en
                      ? link.label.es
                      : locale === 'es'
                        ? link.label.es
                        : link.label.en}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.drawerActions}>
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
        </div>
      </div>
    </div>
  );
}
