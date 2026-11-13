import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Translatable } from '@jf/shared-types';

import { isLocale } from '@/i18n/config';
import { getRoute } from '@/i18n/routes';
import { fetchServiceBySlugServer } from '@/server/services';

import styles from './page.module.css';

type ServicioDetailPageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function ServicioDetailPage({ params }: ServicioDetailPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations();

  const service = await fetchServiceBySlugServer(slug);
  if (!service) notFound();

  const pick = (value?: Translatable) => value?.[locale]?.trim() || value?.es?.trim() || '';
  const resumen = pick(service.resumen);
  const paragraphs = pick(service.cuerpo)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <a href={getRoute('services', locale)} className={styles.backLink}>
          {t('common.back')} · {t('nav.services')}
        </a>
        <div className={styles.header}>
          <h1 className={styles.title}>{pick(service.titulo)}</h1>
          {resumen && <p className={styles.subtitle}>{resumen}</p>}
        </div>

        {paragraphs.length > 0 && (
          <div className={styles.detail}>
            {paragraphs.map((paragraph, index) => (
              <p key={index} className={styles.detailText}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
