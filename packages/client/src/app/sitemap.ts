import { MetadataRoute } from 'next';
import { getRoute, type RouteKey } from '@/i18n/routes';

export default function Sitemap(): MetadataRoute.Sitemap {
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

  return urls;
}
