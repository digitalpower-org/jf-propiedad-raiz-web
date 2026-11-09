import type { PropertyCard } from '@jf/shared-types';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import styles from './property-card-utils.module.css';

export const operacionLabels = {
  es: { VENTA: 'Venta', ALQUILER: 'Alquiler', PROYECTO_SOBRE_PLANOS: 'Proyecto' },
  en: { VENTA: 'For Sale', ALQUILER: 'For Rent', PROYECTO_SOBRE_PLANOS: 'Off-Plan' },
} as const;

export function getOperacionLabel(
  operacion: string,
  locale: 'es' | 'en',
): string {
  return operacionLabels[locale as keyof typeof operacionLabels][
    operacion as keyof (typeof operacionLabels)[typeof locale]
  ] ?? operacion;
}

export function formatPrice(precio: number, locale: 'es' | 'en'): string {
  return new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(precio);
}

export function buildWhatsAppMessage(
  t: ReturnType<typeof useTranslations>,
  property: PropertyCard,
  locale: 'es' | 'en',
): string {
  return t('whatsappMessage', {
    codigo: property.codigo,
    titulo: property.titulo[locale] ?? '',
  });
}

export function renderSpecs(property: PropertyCard): ReactElement {
  const municipio = property.municipio ?? '';
  const departamento = property.departamento ?? '';

  return (
    <div className={styles.specsRow}>
      <span className={styles.specItem}>
        {municipio}, {departamento}
      </span>
      {property.dormitorios && (
        <span className={styles.specItem}>
          {property.dormitorios}
        </span>
      )}
      {property.banos && (
        <span className={styles.specItem}>
          {property.banos}
        </span>
      )}
      {property.areaConstruida && (
        <span className={styles.specItem}>
          {property.areaConstruida} m²
        </span>
      )}
      {property.estrato && (
        <span className={styles.specItem}>
          {property.estrato}
        </span>
      )}
    </div>
  );
}
