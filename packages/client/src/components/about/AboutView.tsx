import { useTranslations } from 'next-intl';
import type { Locale } from '@/i18n/config';
import type { AboutData } from '@/server/about';
import { pickTranslatable } from '@/lib/translatable';
import styles from './AboutView.module.css';

interface AboutViewProps {
  /** Documento de Nosotros; `null` si el backend no tiene ninguno (AC5.6.3). */
  readonly about: AboutData | null;
  readonly locale: Locale;
  /** El backend falló: se avisa con un estado propio y no se confunde con «vacío». */
  readonly noDisponible?: boolean;
}

/** Un párrafo por cada bloque separado por una línea en blanco. Siempre como texto (AC5.6.5). */
const aParrafos = (cuerpo: string): string[] =>
  cuerpo
    .split(/\n{2,}/)
    .map((parrafo) => parrafo.trim())
    .filter(Boolean);

/** Iniciales de las dos primeras palabras del nombre, para el avatar sin foto (AC5.6.2). */
const iniciales = (nombre: string): string =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');

/** Página «Nosotros» (US5.6): pinta el documento del backend y nada más. */
export function AboutView({ about, locale, noDisponible = false }: AboutViewProps) {
  const t = useTranslations('about');

  const titulo = pickTranslatable(about?.titulo, locale) || t('title');
  const secciones = (about?.secciones ?? [])
    .map((seccion) => ({
      id: seccion.id,
      titulo: pickTranslatable(seccion.titulo, locale),
      parrafos: aParrafos(pickTranslatable(seccion.cuerpo, locale)),
    }))
    .filter((seccion) => seccion.titulo || seccion.parrafos.length > 0);
  const equipo = (about?.equipo ?? []).filter((integrante) => integrante.nombre.trim());
  const vacio = !noDisponible && secciones.length === 0 && equipo.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>{titulo}</h1>

        {noDisponible && (
          <section data-testid="about-no-disponible" className={styles.vacio}>
            <h2 className={styles.vacioTitulo}>{t('unavailableTitle')}</h2>
            <p className={styles.paragraph}>{t('unavailableHint')}</p>
          </section>
        )}

        {vacio && (
          <section data-testid="about-vacio" className={styles.vacio}>
            <h2 className={styles.vacioTitulo}>{t('emptyTitle')}</h2>
            <p className={styles.paragraph}>{t('emptyHint')}</p>
          </section>
        )}

        {secciones.length > 0 && (
          <div data-testid="about-secciones">
            {secciones.map((seccion) => (
              <section key={seccion.id} className={styles.contentSection}>
                <h2 className={styles.sectionTitle}>{seccion.titulo}</h2>
                <div className={styles.sectionBody}>
                  {seccion.parrafos.map((parrafo, indice) => (
                    <p key={indice} className={styles.paragraph}>
                      {parrafo}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {equipo.length > 0 && (
          <section data-testid="about-equipo" className={styles.teamSection}>
            <h2 className={styles.teamTitle}>{t('teamTitle')}</h2>
            <div className={styles.teamGrid}>
              {equipo.map((integrante) => {
                const cargo = pickTranslatable(integrante.cargo, locale);
                const descripcion = pickTranslatable(integrante.descripcion, locale);
                return (
                  <article key={integrante.id} className={styles.teamCard}>
                    <div className={styles.avatar} aria-hidden="true">
                      {iniciales(integrante.nombre)}
                    </div>
                    <div className={styles.memberContent}>
                      <h3 className={styles.memberName}>{integrante.nombre}</h3>
                      {cargo && <p className={styles.memberRole}>{cargo}</p>}
                      {descripcion && <p className={styles.memberDesc}>{descripcion}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
