import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { buildWhatsAppUrl, getWhatsAppNumber } from '@/lib/whatsapp';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type ContactoPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ContactoPage({ params }: ContactoPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();

  const whatsappNumber = getWhatsAppNumber();
  const whatsappMessage = t('contact.contactMessage', {
    nombre: '',
    mensaje: 'Hola, me gustaría más información sobre sus servicios.',
  });
  const ctaUrl = whatsappNumber
    ? buildWhatsAppUrl({ number: whatsappNumber, message: whatsappMessage })
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('contact.title')}</h1>
          <p className={styles.subtitle}>
            {locale === 'es'
              ? 'Escríbanos para más información.'
              : 'Write to us for more information.'}
          </p>
        </div>

        <div className={styles.contactCard}>
          <div className={styles.contactInfo}>
            <p className={styles.contactLabel}>
              {locale === 'es' ? 'Escríbanos por WhatsApp' : 'Message us on WhatsApp'}
            </p>
            {ctaUrl && (
              <a href={ctaUrl} className={styles.whatsappBtn} target="_blank" rel="noopener noreferrer">
                <span className={styles.whatsappIcon}>📱</span>
                {locale === 'es' ? 'Hablar por WhatsApp' : 'Chat on WhatsApp'}
              </a>
            )}
          </div>
          <div className={styles.contactInfo}>
            <p className={styles.contactLabel}>
              {locale === 'es' ? 'Consigne su propiedad' : 'List your property'}
            </p>
            <a
              href={locale === 'es' ? '/es/consigne-su-propiedad' : '/en/list-your-property'}
              className={styles.contactLink}
            >
              {locale === 'es' ? 'Ir al formulario' : 'Go to form'}
              <span className={styles.arrow}>→</span>
            </a>
          </div>
        </div>

        <div className={styles.localeSwitcher}>
          <a
            href={locale === 'es' ? '/en/contact' : '/es/contacto'}
            className={styles.localeLink}
          >
            {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
          </a>
        </div>
      </div>
    </div>
  );
}