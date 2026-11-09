import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type TermsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('terms');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const messagesData = messages as Record<string, unknown>;
  const termsSection = messagesData.terms as Record<string, unknown> | undefined;
  const useItems = Array.isArray(termsSection?.use) ? termsSection.use : [];
  const liabilityItems = Array.isArray(termsSection?.liability) ? termsSection.liability : [];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lastUpdated}>{t('lastUpdated', { date: today })}</p>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('use.title')}</h2>
          <ul className={styles.list}>
            {useItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('content.title')}</h2>
          <p className={styles.sectionBody}>{t('content.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('ip.title')}</h2>
          <p className={styles.sectionBody}>{t('ip.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('links.title')}</h2>
          <p className={styles.sectionBody}>{t('links.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('liability.title')}</h2>
          <ul className={styles.list}>
            {liabilityItems.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('modifications.title')}</h2>
          <p className={styles.sectionBody}>{t('modifications.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('law.title')}</h2>
          <p className={styles.sectionBody}>{t('law.content')}</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{t('contact.title')}</h2>
          <p className={styles.sectionBody}>{t('contact.content')}</p>
        </section>
      </div>
    </div>
  );
}
