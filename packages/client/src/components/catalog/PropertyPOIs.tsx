'use client';
import { useTranslations } from 'next-intl';
import type { PuntoInteres } from '@jf/shared-types';
import styles from './PropertyPOIs.module.css';

interface PropertyPOIsProps {
  readonly puntosInteres: readonly PuntoInteres[];
  readonly locale: 'es' | 'en';
}

const categoryIcons = {
  EDUCACION: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  GIMNASIO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  ZONA_COMERCIAL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M20 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
      <path d="M12 4v16M4 12h16" />
    </svg>
  ),
  AVENIDA_PRINCIPAL: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 12h16M4 8h16M4 16h16" />
    </svg>
  ),
  TRANSPORTE_PUBLICO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M6 16h12" />
      <path d="M10 16c0-3 2-5 5-5s5 2 5 5" />
      <path d="M6 12h12" />
      <path d="M10 12c0-3 2-5 5-5s5 2 5 5" />
    </svg>
  ),
  SALUD: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M12 2v20M2 12h20" />
      <path d="M8 12h8M10 10h4v4h-4z" />
    </svg>
  ),
  PERSONALIZADO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
} as const;

const categoryLabels = {
  es: {
    EDUCACION: 'Educación',
    GIMNASIO: 'Gimnasio',
    ZONA_COMERCIAL: 'Zona comercial',
    AVENIDA_PRINCIPAL: 'Avenida principal',
    TRANSPORTE_PUBLICO: 'Transporte público',
    SALUD: 'Salud',
  },
  en: {
    EDUCACION: 'Education',
    GIMNASIO: 'Gym',
    ZONA_COMERCIAL: 'Commercial area',
    AVENIDA_PRINCIPAL: 'Main avenue',
    TRANSPORTE_PUBLICO: 'Public transport',
    SALUD: 'Healthcare',
  },
} as const;

interface PropertyPOIsProps {
  readonly puntosInteres: readonly PuntoInteres[];
  readonly locale: 'es' | 'en';
}

export function PropertyPOIs({ puntosInteres, locale }: PropertyPOIsProps) {
  const t = useTranslations('property');

  if (!puntosInteres || puntosInteres.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby={styles.titleId}>
      <h2 id={styles.titleId} className={styles.title}>
        {t('pointsOfInterest')}
      </h2>
      <ul className={styles.list} role="list">
        {puntosInteres.map((poi, index) => {
          const categoria = poi.categoria;
          const icon =
            categoryIcons[categoria as keyof typeof categoryIcons] ?? categoryIcons.PERSONALIZADO;
          const label =
            poi.etiqueta?.[locale] ??
            poi.etiqueta?.es ??
            categoryLabels[locale][categoria as keyof typeof categoryLabels.es] ??
            categoria;

          return (
            <li key={index} className={styles.item}>
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
              <span className={styles.label}>{label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
