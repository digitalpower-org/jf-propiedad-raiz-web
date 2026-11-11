import { render, screen, cleanup } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

// Mock next/navigation for each test case
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ locale: 'es', slug: 'test-property' }),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => mockUsePathname(),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => {
    const translations: Record<string, Record<string, string>> = {
      localeSwitcher: {
        switchTo: 'Ver en inglés',
      },
    };
    return (key: string) => translations[namespace ?? 'localeSwitcher']?.[key] ?? key;
  },
}));

// Mock routes
vi.mock('@/i18n/routes', () => ({
  routes: {
    home: { es: '/es', en: '/en' },
    sale: { es: '/es/venta', en: '/en/sale' },
    rent: { es: '/es/alquiler', en: '/en/rent' },
    projects: { es: '/es/proyectos', en: '/en/projects' },
    services: { es: '/es/servicios', en: '/en/services' },
    serviceDetail: { es: '/es/servicios/[slug]', en: '/en/services/[slug]' },
    about: { es: '/es/nosotros', en: '/en/about-us' },
    property: { es: '/es/propiedad/[slug]', en: '/en/property/[slug]' },
    consign: { es: '/es/consigne-su-propiedad', en: '/en/list-your-property' },
    contact: { es: '/es/contacto', en: '/en/contact' },
    privacy: { es: '/es/aviso-de-privacidad', en: '/en/privacy-notice' },
    dataPolicy: { es: '/es/politica-de-tratamiento-de-datos', en: '/en/data-processing-policy' },
    terms: { es: '/es/terminos', en: '/en/terms' },
  },
  getEquivalentPath: vi.fn((pathname: string, search: string, targetLocale: string) => {
    // Simplified implementation matching actual getEquivalentPath logic
    const routes: Record<string, Record<string, string>> = {
      home: { es: '/es', en: '/en' },
      sale: { es: '/es/venta', en: '/en/sale' },
      rent: { es: '/es/alquiler', en: '/en/rent' },
      projects: { es: '/es/proyectos', en: '/en/projects' },
      services: { es: '/es/servicios', en: '/en/services' },
      about: { es: '/es/nosotros', en: '/en/about-us' },
      property: { es: '/es/propiedad/[slug]', en: '/en/property/[slug]' },
    };

    // Parse pathname to find matching route
    const segments = pathname.split('/').filter(Boolean);
    const localeSegment = segments[0];
    if (!['es', 'en'].includes(localeSegment)) {
      return routes.home[targetLocale as 'es' | 'en'];
    }

    const routePath = segments.slice(1).join('/');

    // Match known routes - check for dynamic routes first
    if (routePath.startsWith('propiedad/')) {
      // Dynamic route with slug: /es/propiedad/casa-1
      const slug = routePath.replace('propiedad/', '');
      return `${routes.property[targetLocale as 'es' | 'en'].replace('[slug]', slug)}${search}`;
    }
    if (routePath.startsWith('property/')) {
      // Dynamic route with slug: /en/property/casa-1
      const slug = routePath.replace('property/', '');
      return `${routes.property[targetLocale as 'es' | 'en'].replace('[slug]', slug)}${search}`;
    }
    if (routePath.startsWith('servicios/')) {
      // Dynamic route with slug: /es/servicios/asesoria-legal
      const slug = routePath.replace('servicios/', '');
      const serviceDetailTemplate =
        targetLocale === 'es' ? '/es/servicios/[slug]' : '/en/services/[slug]';
      return `${serviceDetailTemplate.replace('[slug]', slug)}${search}`;
    }
    if (routePath.startsWith('services/')) {
      // Dynamic route with slug: /en/services/asesoria-legal
      const slug = routePath.replace('services/', '');
      const serviceDetailTemplate =
        targetLocale === 'es' ? '/es/servicios/[slug]' : '/en/services/[slug]';
      return `${serviceDetailTemplate.replace('[slug]', slug)}${search}`;
    }
    if (routePath === 'venta') {
      return `${routes.sale[targetLocale as 'es' | 'en']}${search}`;
    }
    if (routePath === 'alquiler') {
      return `${routes.rent[targetLocale as 'es' | 'en']}${search}`;
    }
    if (routePath === 'proyectos') {
      return `${routes.projects[targetLocale as 'es' | 'en']}${search}`;
    }
    if (routePath === 'servicios') {
      return `${routes.services[targetLocale as 'es' | 'en']}${search}`;
    }
    if (routePath === 'nosotros') {
      return `${routes.about[targetLocale as 'es' | 'en']}${search}`;
    }

    return routes.home[targetLocale as 'es' | 'en'];
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUsePathname.mockReturnValue('/es');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders link to English home when on Spanish home', () => {
    mockUsePathname.mockReturnValue('/es');
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en');
  });

  it('renders link to Spanish home when on English home', () => {
    mockUsePathname.mockReturnValue('/en');
    render(<LanguageSwitcher locale="en" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i }); // translation mocked
    expect(link).toHaveAttribute('href', '/es');
  });

  it('preserves slug for property detail: /es/propiedad/casa-1 → /en/property/casa-1', () => {
    mockUsePathname.mockReturnValue('/es/propiedad/casa-1');
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en/property/casa-1');
  });

  it('preserves slug for property detail: /en/property/casa-1 → /es/propiedad/casa-1', () => {
    mockUsePathname.mockReturnValue('/en/property/casa-1');
    render(<LanguageSwitcher locale="en" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/es/propiedad/casa-1');
  });

  it('preserves slug for service detail: /es/servicios/x → /en/services/x', () => {
    mockUsePathname.mockReturnValue('/es/servicios/asesoria-legal');
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en/services/asesoria-legal');
  });

  it('preserves query params: /es/venta?page=2 → /en/sale?page=2', () => {
    mockUsePathname.mockReturnValue('/es/venta');
    mockUseSearchParams.mockReturnValue(new URLSearchParams('page=2'));
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en/sale?page=2');
  });

  it('preserves multiple query params: /es/alquiler?tipo=CASA&departamento=Antioquia → /en/rent?tipo=CASA&departamento=Antioquia', () => {
    mockUsePathname.mockReturnValue('/es/alquiler');
    mockUseSearchParams.mockReturnValue(new URLSearchParams('tipo=CASA&departamento=Antioquia'));
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en/rent?tipo=CASA&departamento=Antioquia');
  });

  it('falls back to target locale home for unknown route', () => {
    mockUsePathname.mockReturnValue('/es/ruta-desconocida');
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/en');
  });

  it('falls back to target locale home for unknown route (en → es)', () => {
    mockUsePathname.mockReturnValue('/en/unknown-route');
    render(<LanguageSwitcher locale="en" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveAttribute('href', '/es');
  });

  it('renders globe icon and translated text', () => {
    render(<LanguageSwitcher locale="es" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toContainHTML('🌐');
    expect(link).toHaveTextContent('Ver en inglés');
  });

  it('applies custom className', () => {
    render(<LanguageSwitcher locale="es" className="custom-class" />);

    const link = screen.getByRole('link', { name: /ver en inglés/i });
    expect(link).toHaveClass('custom-class');
  });

  it('uses custom aria-label when provided', () => {
    render(<LanguageSwitcher locale="es" aria-label="Cambiar a inglés" />);

    const link = screen.getByRole('link', { name: 'Cambiar a inglés' });
    expect(link).toBeInTheDocument();
  });
});
