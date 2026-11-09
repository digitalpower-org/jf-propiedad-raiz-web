import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { PropertyCard } from '@jf/shared-types';
import { isNewProperty } from '@/mocks/property-mock';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import {
  formatPrice,
  getOperacionLabel,
  buildWhatsAppMessage,
  renderSpecs,
} from './property-card-utils';

import React, { ReactElement } from 'react';
import styles from './PropertyCard.module.css';

interface PropertyCardProps {
  readonly property: PropertyCard;
  readonly locale: 'es' | 'en';
}

export function PropertyCardComponent({ property, locale }: PropertyCardProps) {
  const t = useTranslations('property');
  const isNew = isNewProperty(property.createdAt);

  const portada = property.portada?.[1]?.clave || property.portada?.[0]?.clave;
  const sizes = '(max-width: 375px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

  const price = formatPrice(property.precio, locale);
  const operacionLabel = getOperacionLabel(property.operacion, locale);
  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const codigo = property.codigo ?? '';

  // WhatsApp URL for the card (US2.5, AC2.5.1, AC2.5.2)
  const whatsappUrl = buildWhatsAppUrl({
    number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '+573000000000',
    message: buildWhatsAppMessage(t, property, locale),
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ),
  });

  return (
    <article className={styles.card}>
      {isNew && (
        <div className={styles.newBadge}>
          {locale === 'es' ? 'Nuevo' : 'New'}
        </div>
      )}

      <div className={styles.imageContainer}>
        {portada ? (
          <Image
            src={`/${portada}`}
            alt={titulo}
            fill
            sizes={sizes}
            className={styles.image}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span className={styles.placeholderIcon}>🏠</span>
          </div>
        )}

        {property.destacada && (
          <div className={styles.featuredBadge}>
            {locale === 'es' ? 'Destacada' : 'Featured'}
          </div>
        )}
      </div>

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <span className={styles.operationTag}>{operacionLabel}</span>
          <span className={styles.code}>{codigo}</span>
        </div>

        <h3 className={styles.title} style={{ WebkitLineClamp: 1 }}>
          {titulo}
        </h3>

        <p className={styles.price}>{price}</p>

        {renderSpecs(property)}

        <div className={styles.actions}>
          <a
            href={`/${locale}/propiedad/${property.slug}`}
            className={styles.detailsLink}
          >
            {t('details')}
          </a>
          <a
            href={whatsappUrl}
            className={styles.whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('contactAgent')}
          >
            <span className={styles.whatsappIcon}>📱</span>
            {t('contactAgent')}
          </a>
        </div>
      </div>
    </article>
  );
}
