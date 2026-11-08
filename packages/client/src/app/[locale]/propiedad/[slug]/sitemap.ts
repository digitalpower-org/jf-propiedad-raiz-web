import { MetadataRoute } from 'next';
import { getPropertiesByOperacion, getPropertyBySlug } from '@/mocks/property-mock';
import { getRoute } from '@/i18n/routes';

export default function Sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
  const locales = ['es', 'en'] as const;
  const operaciones = ['VENTA', 'ALQUILER', 'PROYECTO_SOBRE_PLANOS'] as const;

  const propertyUrls: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const operacion of operaciones) {
      const properties = getPropertiesByOperacion(operacion);
      for (const property of properties) {
        // Use getPropertyBySlug to get the full detail with descripcion
        const detail = getPropertyBySlug(property.slug);
        if (!detail || detail.status !== 'ACTIVE') continue;

        const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug: property.slug })}`;
        const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug: property.slug })}`;
        const canonicalUrl = locale === 'es' ? alternateEs : alternateEn;

        // Solo incluir en sitemap si tiene traducción completa (AC0.4.5)
        const hasFullTranslation = !!(detail.titulo.en && detail.descripcion?.en);

        if (hasFullTranslation || locale === 'es') {
          propertyUrls.push({
            url: canonicalUrl,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: property.destacada ? 0.9 : 0.7,
            alternates: {
              languages: {
                'es-CO': alternateEs,
                en: alternateEn,
                'x-default': alternateEs,
              },
            },
          });
        }
      }
    }
  }

  return propertyUrls;
}
