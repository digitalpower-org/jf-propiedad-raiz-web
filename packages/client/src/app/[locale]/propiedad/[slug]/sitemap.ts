import { MetadataRoute } from 'next';
import { getRoute } from '@/i18n/routes';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

export default async function Sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
  const locales = ['es', 'en'] as const;

  const propertyUrls: MetadataRoute.Sitemap = [];

  // Obtener todas las propiedades del backend (limit alto para traer todo en una página)
  try {
    const propertiesRes = await fetch(backendUrl('/api/v1/properties?limit=1000'), {
      headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!propertiesRes.ok) {
      return propertyUrls;
    }

    const propertiesData = await propertiesRes.json();
    if (!propertiesData.success || !Array.isArray(propertiesData.data?.items)) {
      return propertyUrls;
    }

    const allProperties = propertiesData.data.items;

    for (const property of allProperties) {
      if (property.status !== 'ACTIVE') continue;

      const hasFullTranslation = !!(
        property.titulo?.en &&
        property.titulo.en.trim() !== '' &&
        property.descripcion?.en &&
        property.descripcion.en.trim() !== ''
      );

      for (const locale of locales) {
        // AC0.4.5: omitir EN sin traducción completa
        if (locale === 'en' && !hasFullTranslation) continue;

        const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug: property.slug })}`;
        const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug: property.slug })}`;
        const canonicalUrl = locale === 'es' ? alternateEs : alternateEn;

        propertyUrls.push({
          url: canonicalUrl,
          lastModified: new Date(property.updatedAt ?? property.createdAt ?? Date.now()),
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
  } catch {
    // Silencioso: si falla, devolvemos array vacío
  }

  return propertyUrls;
}
