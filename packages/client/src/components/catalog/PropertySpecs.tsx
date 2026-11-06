'use client';
import { useTranslations } from 'next-intl';
import type { PropertyDetail } from '@jf/shared-types';
import styles from './PropertySpecs.module.css';

interface PropertySpecsProps {
  readonly property: PropertyDetail;
  readonly locale: 'es' | 'en';
}

const specItems = [
  { key: 'areaConstruida', labelKey: 'builtArea', unit: 'm²', icon: 'area' },
  { key: 'areaLote', labelKey: 'lotArea', unit: 'm²', icon: 'lot' },
  { key: 'dormitorios', labelKey: 'bedrooms', unit: '', icon: 'bed' },
  { key: 'banos', labelKey: 'bathrooms', unit: '', icon: 'bath' },
  { key: 'parqueaderos', labelKey: 'parking', unit: '', icon: 'parking' },
  { key: 'estrato', labelKey: 'stratum', unit: '', icon: 'stratum' },
  { key: 'antiguedad', labelKey: 'age', unit: 'años', icon: 'age' },
  { key: 'administracion', labelKey: 'adminFee', unit: '', icon: 'admin', formatter: 'currency' },
  { key: 'predial', labelKey: 'propertyTax', unit: '', icon: 'tax', formatter: 'currency' },
] as const;

const icons = {
  area: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  ),
  lot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </svg>
  ),
  bed: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  bath: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 6 6.5 3.5a1.5 1.5 0 00-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 002 2h12a2 2 0 002-2v-5" />
      <path d="M12 6v12M15 3h6M15 21v-6m0 0-3-3m3 3 3-3" />
    </svg>
  ),
  parking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 17h2c.6 0 1-.4 1-1v-4c0-.6-.4-1-1-1h-6c-.6 0-1 .4-1 1v4c0 .6.4 1 1 1h2" />
      <path d="M3 5h2c.6 0 1 .4 1 1v10c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1z" />
    </svg>
  ),
  stratum: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  age: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  tax: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M16 2v4M12 2v4M8 2v4" />
    </svg>
  ),
};

function formatValue(
  locale: 'es' | 'en',
  value: string | number | undefined,
  key: string,
): string | null {
  if (value === undefined || value === null || value === '') return null;

  if (key === 'administracion' || key === 'predial') {
    const num = Number(value.toString().replace(/\./g, ''));
    if (isNaN(num)) return value.toString();
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  }

  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US').format(value);
  }

  return value.toString();
}

interface PropertySpecsProps {
  readonly property: PropertyDetail;
  readonly locale: 'es' | 'en';
}

export function PropertySpecs({ property, locale }: PropertySpecsProps) {
  const t = useTranslations('property');

  return (
    <section className={styles.section} aria-labelledby={styles.specsTitle}>
      <h2 id={styles.specsTitle} className={styles.title}>
        {t('features')}
      </h2>
      <dl className={styles.specsList}>
        {specItems.map((item) => {
          const rawValue = property[item.key as keyof PropertyDetail] as
            string | number | undefined;
          const formatted = formatValue(locale, rawValue, item.key);
          if (formatted === null) return null;

          const Icon = icons[item.icon];
          const label = t(item.labelKey);

          return (
            <div key={item.key} className={styles.specItem}>
              <dt className={styles.specLabel}>
                <span className={styles.specIcon} aria-hidden="true">
                  {Icon}
                </span>
                <span>{label}</span>
              </dt>
              <dd className={styles.specValue}>
                {formatted}
                {item.unit && ` {item.unit}`}
              </dd>
            </div>
          );
        })}
      </dl>

      {property.acabados && (
        <div className={styles.finishes}>
          <dt className={styles.specLabel}>
            <span className={styles.specIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </span>
            <span>{t('finishes')}</span>
          </dt>
          <dd className={styles.specValue}>{property.acabados[locale] ?? property.acabados.es}</dd>
        </div>
      )}
    </section>
  );
}
