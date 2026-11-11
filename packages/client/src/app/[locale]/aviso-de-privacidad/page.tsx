import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type PrivacidadPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacidadPage({ params }: PrivacidadPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('privacy');
  const tLegal = await getTranslations('legal');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const dataCollectedItems = messages.privacy.dataCollected.items as string[];
  const purposeItems = messages.privacy.purpose.items as string[];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {locale === 'es' && (
          <div className={styles.draftBanner} role="status" aria-live="polite">
            {tLegal('draftNotice')}
          </div>
        )}
        {locale === 'en' && (
          <div className={styles.courtesyBanner} role="status" aria-live="polite">
            {tLegal('courtesyTranslation')}
          </div>
        )}
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lastUpdated}>{t('lastUpdated', { date: today })}</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('controller.title')}</h2>
          <p className={styles.sectionBody}>{t('controller.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('dataCollected.title')}</h2>
          <ul className={styles.list}>
            {dataCollectedItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('purpose.title')}</h2>
          <ul className={styles.list}>
            {purposeItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('rights.title')}</h2>
          <p className={styles.sectionBody}>{t('rights.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('exerciseRights.title')}</h2>
          <p className={styles.sectionBody}>{t('exerciseRights.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('security.title')}</h2>
          <p className={styles.sectionBody}>{t('security.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('retention.title')}</h2>
          <p className={styles.sectionBody}>{t('retention.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('changes.title')}</h2>
          <p className={styles.sectionBody}>{t('changes.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('contact.title')}</h2>
          <p className={styles.sectionBody}>{t('contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
