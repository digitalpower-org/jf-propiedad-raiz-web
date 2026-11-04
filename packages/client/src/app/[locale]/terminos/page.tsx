import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

type TerminosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function TerminosPage({ params }: TerminosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('terms');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const useItems = messages.terms.use.items as string[];
  const liabilityItems = messages.terms.liability.items as string[];

  return (
    <div className="prose max-w-3xl mx-auto p-4 md:p-8">
      <h1>{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated', { date: today })}</p>

      <section className="mb-8">
        <h2>{t('use.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {useItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('content.title')}</h2>
        <p>{t('content.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('ip.title')}</h2>
        <p>{t('ip.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('links.title')}</h2>
        <p>{t('links.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('liability.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {liabilityItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('modifications.title')}</h2>
        <p>{t('modifications.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('law.title')}</h2>
        <p>{t('law.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('contact.title')}</h2>
        <p>{t('contact.content')}</p>
      </section>
    </div>
  );
}