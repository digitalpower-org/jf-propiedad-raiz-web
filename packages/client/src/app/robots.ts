import { MetadataRoute } from 'next';

export default function Robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jfpropiedadraiz.com';

  const disallowAdminApi = ['/admin/', '/api/'];

  return {
    rules: [
      // Grupos explícitos para bots conocidos (AC2.7.5)
      // Cada grupo repite los Disallow; un grupo específico NO hereda del grupo *
      { userAgent: 'ClaudeBot', allow: '/', disallow: disallowAdminApi },
      { userAgent: 'GPTBot', allow: '/', disallow: disallowAdminApi },
      { userAgent: 'PerplexityBot', allow: '/', disallow: disallowAdminApi },
      { userAgent: 'Google-Extended', allow: '/', disallow: disallowAdminApi },
      { userAgent: 'CCBot', allow: '/', disallow: disallowAdminApi },
      // Fallback para el resto
      { userAgent: '*', allow: '/', disallow: [...disallowAdminApi, '/_next/', '/static/'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
