import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

type PrivacidadPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PrivacidadPage({ params }: PrivacidadPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('privacy');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const dataCollectedItems = messages.privacy.dataCollected.items as string[];
  const purposeItems = messages.privacy.purpose.items as string[];

  return (
    <div className="prose max-w-3xl mx-auto p-4 md:p-8">
      <h1>{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated', { date: today })}</p>

      <section className="mb-8">
        <h2>{t('controller.title')}</h2>
        <p>{t('controller.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('dataCollected.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {dataCollectedItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('purpose.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {purposeItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('rights.title')}</h2>
        <p>{t('rights.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('exerciseRights.title')}</h2>
        <p>{t('exerciseRights.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('security.title')}</h2>
        <p>{t('security.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('retention.title')}</h2>
        <p>{t('retention.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('changes.title')}</h2>
        <p>{t('changes.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('contact.title')}</h2>
        <p>{t('contact.content')}</p>
      </section>
    </div>
  );
}