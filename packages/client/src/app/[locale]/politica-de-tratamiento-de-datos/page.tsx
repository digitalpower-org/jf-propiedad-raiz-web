import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

type PoliticaPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PoliticaPage({ params }: PoliticaPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('dataProcessing');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const principlesItems = messages.dataProcessing.principles.items as string[];
  const dutiesItems = messages.dataProcessing.duties.items as string[];

  return (
    <div className="prose max-w-3xl mx-auto p-4 md:p-8">
      <h1>{t('title')}</h1>
      <p className="text-sm text-muted-foreground mb-8">{t('lastUpdated', { date: today })}</p>

      <section className="mb-8">
        <h2>{t('principles.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {principlesItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('authorization.title')}</h2>
        <p>{t('authorization.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('duties.title')}</h2>
        <ul className="list-disc pl-6 space-y-2">
          {dutiesItems.map((item: string, i: number) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2>{t('internationalTransfer.title')}</h2>
        <p>{t('internationalTransfer.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('children.title')}</h2>
        <p>{t('children.content')}</p>
      </section>

      <section className="mb-8">
        <h2>{t('contact.title')}</h2>
        <p>{t('contact.content')}</p>
      </section>
    </div>
  );
}
