import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConsignmentForm } from '@/components/consignment/ConsignmentForm';
import { isLocale } from '@/i18n/config';
import { routes } from '@/i18n/routes';
import { getWhatsAppNumber } from '@/lib/whatsapp';
import styles from './page.module.css';

type ConsignPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ConsignPage({ params }: ConsignPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('consign');

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </header>

        <section className={styles.introSection}>
          <p className={styles.introText}>{t('intro')}</p>
        </section>

        <ConsignmentForm
          locale={locale}
          whatsappNumber={getWhatsAppNumber()}
          dataPolicyHref={routes.dataPolicy[locale]}
        />

        <a href={routes.contact[locale]} className={styles.contactLink}>
          {t('contactLink')}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
