import { getRoute, type RouteKey } from '@/i18n/routes';
import type { Locale } from '@/i18n/config';

type NavbarLink = {
  readonly key: RouteKey;
  readonly label: { readonly es: string; readonly en: string };
};

type NavbarProps = {
  readonly locale: Locale;
};

/**
 * Barra de navegación horizontal simple.
 * Usa `getRoute` para construir las URLs traducidas según el locale activo.
 */
export default function Navbar({ locale }: NavbarProps) {
  const links: NavbarLink[] = [
    { key: 'home', label: { es: 'Inicio', en: 'Home' } },
    { key: 'sale', label: { es: 'Venta', en: 'For Sale' } },
    { key: 'rent', label: { es: 'Alquiler', en: 'For Rent' } },
    { key: 'projects', label: { es: 'Proyectos', en: 'Projects' } },
    { key: 'services', label: { es: 'Servicios', en: 'Services' } },
    { key: 'about', label: { es: 'Nosotros', en: 'About Us' } },
    { key: 'contact', label: { es: 'Contacto', en: 'Contact' } },
  ];

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900">JF Propiedad Raíz</span>
          </div>
          <div className="hidden md:flex space-x-16">
            {links.map((link) => {
              const href = getRoute(link.key, locale as 'es' | 'en');
              return (
                <a
                  key={link.key}
                  href={href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    link.key === 'home'
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {link.label.es === link.label.en
                    ? link.label.es
                    : locale === 'es'
                      ? link.label.es
                      : link.label.en}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
