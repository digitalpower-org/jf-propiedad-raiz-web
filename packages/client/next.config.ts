import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Rewrites para rutas traducidas: las carpetas físicas están en español
  // (venta, alquiler, etc.) pero las URLs en inglés usan los segmentos
  // traducidos (sale, rent, etc.) definidos en src/i18n/routes.ts.
  async rewrites() {
    return [
      { source: '/en/sale', destination: '/en/venta' },
      { source: '/en/rent', destination: '/en/alquiler' },
      { source: '/en/projects', destination: '/en/proyectos' },
      { source: '/en/services', destination: '/en/servicios' },
      { source: '/en/services/:slug*', destination: '/en/servicios/:slug*' },
      { source: '/en/property/:slug*', destination: '/en/propiedad/:slug*' },
      { source: '/en/about-us', destination: '/en/nosotros' },
      { source: '/en/list-your-property', destination: '/en/consigne-su-propiedad' },
      { source: '/en/contact', destination: '/en/contacto' },
      { source: '/en/privacy-notice', destination: '/en/aviso-de-privacidad' },
      { source: '/en/data-processing-policy', destination: '/en/politica-de-tratamiento-de-datos' },
      { source: '/en/terms', destination: '/en/terminos' },
    ];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
