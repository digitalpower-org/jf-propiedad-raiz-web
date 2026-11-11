import '@testing-library/jest-dom';
import { vi } from 'vitest';

// vi.mock se hoistea al inicio del archivo, así que lo compartido debe ir en vi.hoisted
const { createTranslator, setLocale } = vi.hoisted(() => {
  const translationsEs: Record<string, Record<string, string>> = {
    property: {
      gallery: 'Galería',
      details: 'Detalles',
      virtualTour: 'Tour virtual 360°',
      videos: 'Videos',
      pointsOfInterest: 'Puntos de interés',
      features: 'Características',
      price: 'Precio',
      area: 'Área',
      bedrooms: 'Habitaciones',
      bathrooms: 'Baños',
      parking: 'Parqueaderos',
      stratum: 'Estrato',
      age: 'Antigüedad',
      builtArea: 'Área construida',
      lotArea: 'Área lote',
      propertyTax: 'Predial',
      adminFee: 'Administración',
      finishes: 'Acabados',
      contactAgent: 'Contactar agente',
      whatsappMessage:
        'Hola, me interesa la propiedad {codigo} - {titulo}. ¿Podrían darme más información?',
      New: 'Nuevo',
      Featured: 'Destacada',
    },
  };

  const translationsEn: Record<string, Record<string, string>> = {
    property: {
      gallery: 'Gallery',
      details: 'Details',
      virtualTour: '360° Virtual Tour',
      videos: 'Videos',
      pointsOfInterest: 'Points of Interest',
      features: 'Features',
      price: 'Price',
      area: 'Area',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      parking: 'Parking',
      stratum: 'Stratum',
      age: 'Age',
      builtArea: 'Built Area',
      lotArea: 'Lot Area',
      propertyTax: 'Property Tax',
      adminFee: 'Admin Fee',
      finishes: 'Finishes',
      contactAgent: 'Contact Agent',
      whatsappMessage:
        "Hello, I'm interested in property {codigo} - {titulo}. Could you provide more information?",
      New: 'New',
      Featured: 'Featured',
    },
  };

  let currentLocale = 'es';

  const createTranslator =
    (namespace?: string) => (key: string, params?: Record<string, string>) => {
      const translations = currentLocale === 'en' ? translationsEn : translationsEs;
      const ns = translations[namespace ?? 'property'] ?? translations.property ?? {};
      let result = ns[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
        });
      }
      return result;
    };

  // Helper to set locale for tests
  const setLocale = (locale: 'es' | 'en') => {
    currentLocale = locale;
  };

  return { createTranslator, setLocale };
});

// Export setLocale for tests to use
export { setLocale };

// next-intl (client)
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => createTranslator(namespace),
}));

// next-intl/server (server components)
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace?: string) => createTranslator(namespace),
  setRequestLocale: vi.fn(),
  getLocale: async () => 'es',
}));

// next/image
vi.mock('next/image', async () => {
  const React = await import('react');
  interface ImageProps {
    src?: string;
    alt?: string;
    className?: string;
    width?: number | string;
    height?: number | string;
    onClick?: () => void;
    onLoad?: () => void;
    onError?: () => void;
    fill?: boolean;
    sizes?: string;
    priority?: boolean;
    placeholder?: string;
    blurDataURL?: string;
    [key: string]: unknown;
  }
  const ImageComponent = (props: ImageProps) => {
    const { src, alt, className, width, height, onClick, onLoad, onError } = props;
    return React.createElement('img', {
      'data-testid': 'next-image',
      src,
      alt,
      className,
      width,
      height,
      onClick,
      onLoad,
      onError,
    });
  };
  return { default: ImageComponent };
});

// @jf/shared-types
vi.mock('@jf/shared-types', () => ({
  DerivadoImagen: {},
  Foto: {},
  VideoYouTube: {},
  Panorama: {},
  PanoramaViewer: {},
  PropertyDetail: {},
  PropertyCard: {},
  PuntoInteres: {},
  Translatable: {},
}));

// @/lib/whatsapp
vi.mock('@/lib/whatsapp', () => ({
  buildWhatsAppUrl: ({ number, message }: { number: string; message: string }) => {
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  },
}));

// pannellum
vi.mock('pannellum', () => ({
  default: {
    viewer: vi.fn(() => ({
      destroy: vi.fn(),
    })),
  },
}));

// next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ locale: 'es', slug: 'test-property' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/es/propiedad/test-property',
}));
