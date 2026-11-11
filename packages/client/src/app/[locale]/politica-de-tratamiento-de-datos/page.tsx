import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type DataProcessingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DataProcessingPage({ params }: DataProcessingPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('dataProcessing');
  const tLegal = await getTranslations('legal');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const messagesData = messages as Record<string, unknown>;
  const dataProcessing = messagesData.dataProcessing as Record<string, unknown> | undefined;
  const principlesItems = Array.isArray(dataProcessing?.principles)
    ? dataProcessing.principles
    : [];
  const dutiesItems = Array.isArray(dataProcessing?.duties) ? dataProcessing.duties : [];

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
          <h2 className={styles.sectionTitle}>{t('principles.title')}</h2>
          <ul className={styles.list}>
            {principlesItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('authorization.title')}</h2>
          <p className={styles.sectionBody}>{t('authorization.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('duties.title')}</h2>
          <ul className={styles.list}>
            {dutiesItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('internationalTransfer.title')}</h2>
          <p className={styles.sectionBody}>{t('internationalTransfer.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('children.title')}</h2>
          <p className={styles.sectionBody}>{t('children.content')}</p>
        </section>

        <section className={styles.section}>
          <p className={styles.sectionBody}>{tLegal('formStorageNotice')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('contact.title')}</h2>
          <p className={styles.sectionBody}>{t('contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
