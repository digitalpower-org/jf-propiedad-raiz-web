import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Filters, type PropertyFilters } from './Filters';

// Fija el comportamiento actual de la ubicación (departamento y municipio) del filtro del
// catálogo, para que el refactor que lo pasa a lib/consignment/locations no cambie lo que ve
// el usuario. Los nombres propios no se traducen: en es y en son los mismos.
// Referencias estables: el router y los parámetros reales no cambian entre renders, y si el
// simulacro devolviera objetos nuevos cada vez, un efecto que dependa de ellos entraría en bucle.
const navigation = vi.hoisted(() => ({
  router: {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
  },
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => navigation.searchParams,
  usePathname: () => '/es/venta',
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

const DEPARTAMENTOS = [
  'Antioquia',
  'Cundinamarca',
  'Valle del Cauca',
  'Atlántico',
  'Santander',
  'Bolívar',
];

const MUNICIPIOS: Record<string, string[]> = {
  Antioquia: ['Medellín', 'Envigado', 'Itagüí', 'Bello', 'Sabaneta', 'Rionegro', 'Copacabana'],
  Cundinamarca: ['Bogotá', 'Soacha', 'Chía', 'Cajicá'],
  'Valle del Cauca': ['Cali', 'Palmira', 'Tuluá'],
  Atlántico: ['Barranquilla', 'Soledad'],
  Santander: ['Bucaramanga', 'Floridablanca'],
  Bolívar: ['Cartagena'],
};

const PLACEHOLDERS = {
  es: { departamento: 'Departamento', municipio: 'Municipio' },
  en: { departamento: 'Department', municipio: 'Municipality' },
} as const;

function renderFilters(locale: 'es' | 'en', initialFilters?: PropertyFilters) {
  return render(
    <MantineProvider>
      <Filters
        operacion="VENTA"
        locale={locale}
        onFiltersChange={vi.fn()}
        {...(initialFilters ? { initialFilters } : {})}
      />
    </MantineProvider>,
  );
}

const departamentoInput = (locale: 'es' | 'en') =>
  screen.getByPlaceholderText(PLACEHOLDERS[locale].departamento) as HTMLInputElement;
const municipioInput = (locale: 'es' | 'en') =>
  screen.getByPlaceholderText(PLACEHOLDERS[locale].municipio) as HTMLInputElement;
const optionTexts = () => screen.queryAllByRole('option').map((option) => option.textContent);

describe('Filters | ubicación', () => {
  it('sin departamento elegido, el municipio está deshabilitado', () => {
    renderFilters('es');
    expect(municipioInput('es')).toBeDisabled();
  });

  it.each(['es', 'en'] as const)('ofrece los 6 departamentos, en orden (%s)', (locale) => {
    renderFilters(locale);
    fireEvent.click(departamentoInput(locale));
    expect(optionTexts()).toEqual(DEPARTAMENTOS);
  });

  it.each(Object.entries(MUNICIPIOS))(
    'con %s ofrece sus municipios, en orden',
    (departamento, esperados) => {
      renderFilters('es', { departamento });
      expect(municipioInput('es')).toBeEnabled();
      fireEvent.click(municipioInput('es'));
      expect(optionTexts()).toEqual(esperados);
    },
  );

  it('en inglés los municipios llevan los mismos nombres', () => {
    renderFilters('en', { departamento: 'Antioquia' });
    fireEvent.click(municipioInput('en'));
    expect(optionTexts()).toEqual(MUNICIPIOS.Antioquia);
  });

  it('al elegir otro departamento se limpia el municipio', () => {
    renderFilters('es', { departamento: 'Antioquia', municipio: 'Medellín' });
    expect(municipioInput('es').value).toBe('Medellín');

    fireEvent.click(departamentoInput('es'));
    fireEvent.click(screen.getByRole('option', { name: 'Bolívar' }));

    expect(departamentoInput('es').value).toBe('Bolívar');
    expect(municipioInput('es').value).toBe('');
  });

  it('un departamento desconocido no ofrece municipios', () => {
    renderFilters('es', { departamento: 'Narnia' });
    fireEvent.click(municipioInput('es'));
    expect(optionTexts()).toEqual([]);
  });

  it.each(['toString', 'constructor', '__proto__'])(
    'el departamento «%s» (p. ej. desde la URL) no rompe el filtro ni ofrece municipios',
    (departamento) => {
      expect(() => renderFilters('es', { departamento })).not.toThrow();
      fireEvent.click(municipioInput('es'));
      expect(optionTexts()).toEqual([]);
    },
  );
});
