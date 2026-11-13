import { MetadataRoute } from 'next';
import { getRoute, type RouteKey } from '@/i18n/routes';
import { backendUrl } from '@/server/backend-url';
import { fetchAllPublicProperties } from '@/server/public-properties';
import { env } from '@/server/config/server-config';

// Consulta el backend en cada petición: durante el build el fetch con no-store aborta la
// generación estática y el sitemap quedaba sin servicios ni propiedades.
export const dynamic = 'force-dynamic';

export default async function Sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';
  const locales = ['es', 'en'] as const;

  const staticRoutes = [
    { route: 'home' as RouteKey, changeFrequency: 'daily' as const, priority: 1.0 },
    { route: 'sale' as RouteKey, changeFrequency: 'daily' as const, priority: 0.9 },
    { route: 'rent' as RouteKey, changeFrequency: 'daily' as const, priority: 0.9 },
    { route: 'projects' as RouteKey, changeFrequency: 'daily' as const, priority: 0.9 },
    { route: 'services' as RouteKey, changeFrequency: 'weekly' as const, priority: 0.8 },
    { route: 'about' as RouteKey, changeFrequency: 'monthly' as const, priority: 0.7 },
    { route: 'contact' as RouteKey, changeFrequency: 'monthly' as const, priority: 0.6 },
    { route: 'privacy' as RouteKey, changeFrequency: 'yearly' as const, priority: 0.3 },
    { route: 'dataPolicy' as RouteKey, changeFrequency: 'yearly' as const, priority: 0.3 },
    { route: 'terms' as RouteKey, changeFrequency: 'yearly' as const, priority: 0.3 },
    { route: 'consign' as RouteKey, changeFrequency: 'weekly' as const, priority: 0.5 },
  ];

  const urls: MetadataRoute.Sitemap = [];

  // 1. Rutas estáticas
  for (const locale of locales) {
    for (const { route, changeFrequency, priority } of staticRoutes) {
      const alternateEs = `${baseUrl}${getRoute(route, 'es')}`;
      const alternateEn = `${baseUrl}${getRoute(route, 'en')}`;
      const canonicalUrl = locale === 'es' ? alternateEs : alternateEn;

      urls.push({
        url: canonicalUrl,
        lastModified: new Date(),
        changeFrequency,
        priority,
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

  // 2. Servicios activos
  try {
    const servicesRes = await fetch(backendUrl('/api/v1/services'), {
      headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (servicesRes.ok) {
      const servicesData = await servicesRes.json();
      if (servicesData.success && Array.isArray(servicesData.data?.items)) {
        for (const service of servicesData.data.items) {
          for (const locale of locales) {
            const alternateEs = `${baseUrl}${getRoute('serviceDetail', 'es', { slug: service.slug })}`;
            const alternateEn = `${baseUrl}${getRoute('serviceDetail', 'en', { slug: service.slug })}`;
            const canonicalUrl = locale === 'es' ? alternateEs : alternateEn;

            urls.push({
              url: canonicalUrl,
              lastModified: new Date(),
              changeFrequency: 'weekly',
              priority: 0.8,
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
  } catch {
    // Silencioso: si falla, seguimos con rutas estáticas
  }

  // 3. Propiedades públicas (el backend solo expone ACTIVE; ver server/public-properties.ts)
  try {
    const properties = await fetchAllPublicProperties();
    for (const property of properties) {
      // AC0.4.5: omitir EN sin traducción. La tarjeta pública solo trae el título,
      // así que aquí solo se puede verificar titulo.en (limitación del contrato).
      const hasEnglish = !!property.titulo?.en?.trim();

      for (const locale of locales) {
        if (locale === 'en' && !hasEnglish) continue;

        const alternateEs = `${baseUrl}${getRoute('property', 'es', { slug: property.slug })}`;
        const alternateEn = `${baseUrl}${getRoute('property', 'en', { slug: property.slug })}`;

        urls.push({
          url: locale === 'es' ? alternateEs : alternateEn,
          lastModified: new Date(property.createdAt),
          changeFrequency: 'weekly',
          priority: property.destacada ? 0.9 : 0.7,
          alternates: {
            languages: { 'es-CO': alternateEs, en: alternateEn, 'x-default': alternateEs },
          },
        });
      }
    }
  } catch (error) {
    // Las rutas estáticas y de servicios se siguen sirviendo, pero el fallo no pasa en silencio.
    console.error('Sitemap: no se pudieron leer las propiedades públicas', error);
  }

  return urls;
}
