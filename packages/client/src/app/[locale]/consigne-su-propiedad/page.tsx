import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/config';
import { getWhatsAppNumber, buildWhatsAppUrl } from '@/lib/whatsapp';

import styles from './page.module.css';

type ConsignPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ConsignPage({ params }: ConsignPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();

  const whatsappNumber = getWhatsAppNumber();
  const whatsappMessage = t('consign.whatsappMessage', {
    nombre: '',
    mensaje: 'Hola, me gustaría consignar mi propiedad.',
  });
  const ctaUrl = whatsappNumber
    ? buildWhatsAppUrl({ number: whatsappNumber, message: whatsappMessage })
    : null;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('consign.title')}</h1>
          <p className={styles.subtitle}>
            {locale === 'es'
              ? 'Publique su inmueble en nuestro catálogo.'
              : 'List your property in our catalog.'}
          </p>
        </header>

        <section className={styles.introSection}>
          <p className={styles.introText}>
            {locale === 'es'
              ? 'Complete el siguiente formulario para consignar su propiedad. Uno de nuestros asesores se pondrá en contacto con usted a la brevedad.'
              : 'Complete the form below to list your property. One of our advisors will contact you shortly.'}
          </p>
        </section>

        <div className={styles.ctaRow}>
          {ctaUrl && (
            <a
              href={ctaUrl}
              className={styles.whatsappBtn}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t('consign.whatsapp')}
            >
              <span className={styles.whatsappIcon}>📱</span>
              {t('consign.whatsapp')}
            </a>
          )}
          <a href={locale === 'es' ? '/es/contacto' : '/en/contact'} className={styles.contactLink}>
            {locale === 'es' ? 'Contactarnos directamente' : 'Contact us directly'}
            <span className={styles.arrow}>→</span>
          </a>
        </div>

        <div className={styles.localeSwitcher}>
          <a
            href={locale === 'es' ? '/en/list-your-property' : '/es/consigne-su-propiedad'}
            className={styles.localeLink}
          >
            {locale === 'es' ? 'Ver en inglés' : 'View in Spanish'}
          </a>
        </div>
      </div>
    </div>
  );
}
