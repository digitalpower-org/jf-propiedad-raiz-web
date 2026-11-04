import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { PropertyCard } from '@jf/shared-types';
import { isNewProperty } from '@/mocks/property-mock';

interface PropertyCardProps {
  readonly property: PropertyCard;
  readonly locale: 'es' | 'en';
}

const operacionLabels = {
  es: {
    VENTA: 'Venta',
    ALQUILER: 'Alquiler',
    PROYECTO_SOBRE_PLANOS: 'Proyecto',
  },
  en: {
    VENTA: 'For Sale',
    ALQUILER: 'For Rent',
    PROYECTO_SOBRE_PLANOS: 'Off-Plan',
  },
};

export function PropertyCardComponent({ property, locale }: PropertyCardProps) {
  const t = useTranslations('property');
  const isNew = isNewProperty(property.createdAt);

  const portada = property.portada?.[1]?.clave || property.portada?.[0]?.clave;
  const sizes = '(max-width: 375px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw';

  const priceFormatter = new Intl.NumberFormat(locale === 'es' ? 'es-CO' : 'en-US', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const operacionLabel = operacionLabels[locale][property.operacion] || property.operacion;

  const titulo = property.titulo[locale] ?? property.titulo.es ?? '';
  const municipio = property.municipio ?? '';
  const departamento = property.departamento ?? '';
  const codigo = property.codigo ?? '';

  return (
    <article className="group bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
      {isNew && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full">
            {locale === 'es' ? 'Nuevo' : 'New'}
          </span>
        </div>
      )}

      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {portada ? (
          <Image
            src={`/${portada}`}
            alt={titulo}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {property.destacada && (
          <div className="absolute top-3 right-3">
            <span className="bg-yellow-500 text-white text-xs font-medium px-2 py-1 rounded-full">
              {locale === 'es' ? 'Destacada' : 'Featured'}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {operacionLabel}
          </span>
          <span className="text-xs text-gray-400">{codigo}</span>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">{titulo}</h3>

        <p className="text-2xl font-bold text-green-600 mb-3">
          {priceFormatter.format(property.precio)}
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0112 21a7.975 7.975 0 015.657-2.343z"
              />
            </svg>
            {municipio}, {departamento}
          </span>
          {property.dormitorios && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {property.dormitorios}
            </span>
          )}
          {property.banos && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 6 6.5 3.5a1.5 1.5 0 00-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 002 2h12a2 2 0 002-2v-5"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v12M15 3h6M15 21v-6m0 0-3-3m3 3 3-3"
                />
              </svg>
              {property.banos}
            </span>
          )}
          {property.areaConstruida && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              {property.areaConstruida} m²
            </span>
          )}
          {property.estrato && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              {property.estrato}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-gray-100">
          <a
            href={`/${locale}/propiedad/${property.slug}`}
            className="block w-full text-center py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            {t('details')}
          </a>
        </div>
      </div>
    </article>
  );
}
