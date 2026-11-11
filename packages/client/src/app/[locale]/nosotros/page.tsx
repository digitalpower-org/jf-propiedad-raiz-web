import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { loadMessages } from '@/i18n/messages';
import { isLocale } from '@/i18n/config';

import styles from './page.module.css';

type NosotrosPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NosotrosPage({ params }: NosotrosPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const t = await getTranslations('about');
  const messages = await loadMessages(locale);
  const today = new Date().toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US');

  const sections = messages.about.sections as Array<{ id: string; titulo: string; cuerpo: string }>;
  const equipo = messages.about.equipo as Array<{
    id: string;
    nombre: string;
    cargo: string;
    descripcion?: string;
    foto?: string | null;
  }>;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t('title')}</h1>
          <p className={styles.lastUpdated}>{t('lastUpdated', { date: today })}</p>
        </div>

        <section className={styles.extractSection}>
          <p className={styles.extractText}>{t('extracto')}</p>
        </section>

        {sections.map((section) => (
          <section key={section.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>{section.titulo}</h2>
            <div className={styles.sectionBody}>{section.cuerpo}</div>
          </section>
        ))}

        {equipo.length > 0 && (
          <section className={styles.teamSection}>
            <h2 className={styles.sectionTitle}>
              {locale === 'es' ? 'Nuestro Equipo' : 'Our Team'}
            </h2>
            <div className={styles.teamGrid}>
              {equipo.map((member) => (
                <article key={member.id} className={styles.teamCard}>
                  {member.foto && (
                    <div className={styles.memberPhoto}>
                      <img
                        src={member.foto}
                        alt={member.nombre}
                        className={styles.memberPhotoImg}
                      />
                    </div>
                  )}
                  <div className={styles.memberContent}>
                    <h3 className={styles.memberName}>{member.nombre}</h3>
                    <p className={styles.memberRole}>{member.cargo}</p>
                    {member.descripcion && (
                      <p className={styles.memberDesc}>{member.descripcion}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
