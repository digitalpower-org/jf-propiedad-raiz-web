import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Filters, type PropertyFilters } from './Filters';

// Fija el comportamiento actual de la ubicación (departamento y municipio) del filtro del
// catálogo, para que el refactor que lo pasa a lib/consignment/locations no cambie lo que ve
// el usuario. Los nombres propios no se traducen: en es y en son los mismos.
// Referencias estables: el router y los parámetros reales no cambian entre renders, y si el
// simulacro devolviera objetos nuevos cada vez, un efecto que dependa de ellos entraría en bucle.
const pushState = vi.fn();
const navigation = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
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

beforeEach(() => {
  pushState.mockClear();
  vi.spyOn(window.history, 'pushState').mockImplementation(pushState);
});

afterEach(() => {
  navigation.searchParams = new URLSearchParams();
});

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
      <Filters operacion="VENTA" locale={locale} {...(initialFilters ? { initialFilters } : {})} />
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

// US2.2: tipo de un solo valor (D28), sin «Solo destacadas», una única escritura de la URL y
// avisos que impiden las combinaciones que el backend rechaza (AC2.2.2, AC2.2.3).
const TIPOS = [
  'Casa',
  'Apartamento',
  'Lote Campestre',
  'Lote Urbano',
  'Finca',
  'Local Comercial',
  'Bodega',
  'Oficina',
];

const tipoInput = () => screen.getByPlaceholderText('Tipo de inmueble') as HTMLInputElement;
const botonAplicar = () => screen.getByRole('button', { name: 'Aplicar' });
const elegir = (input: HTMLElement, opcion: string) => {
  fireEvent.click(input);
  fireEvent.click(screen.getByRole('option', { name: opcion }));
};
const escribir = (placeholder: string, valor: string) =>
  fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: valor } });

describe('Filters | tipo de inmueble (un solo valor)', () => {
  it('ofrece los 8 tipos, en orden', () => {
    renderFilters('es');
    fireEvent.click(tipoInput());
    expect(optionTexts()).toEqual(TIPOS);
  });

  it('elegir otro tipo reemplaza al anterior, no se acumulan', () => {
    renderFilters('es');
    elegir(tipoInput(), 'Casa');
    expect(tipoInput().value).toBe('Casa');
    elegir(tipoInput(), 'Finca');
    expect(tipoInput().value).toBe('Finca');
  });

  it('una URL con lista de tipos muestra solo el primero', () => {
    navigation.searchParams = new URLSearchParams('tipo=FINCA,CASA');
    renderFilters('es');
    expect(tipoInput().value).toBe('Finca');
  });

  it('«Aplicar» escribe la URL una sola vez, con el tipo elegido', () => {
    renderFilters('es');
    elegir(tipoInput(), 'Casa');
    fireEvent.click(botonAplicar());
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState.mock.calls[0]?.[2]).toContain('tipo=CASA');
  });

  it('«Aplicar» escribe también los filtros de frontend en la URL', () => {
    renderFilters('es');
    elegir(screen.getByPlaceholderText('Dormitorios mín.'), '2+');
    fireEvent.click(botonAplicar());
    expect(pushState.mock.calls[0]?.[2]).toContain('dormitorios=2');
  });

  it.each([
    ['es', 'Solo destacadas'],
    ['en', 'Featured Only'],
  ] as const)('no ofrece la casilla de destacadas (%s)', (locale, texto) => {
    renderFilters(locale);
    expect(screen.queryByText(texto)).toBeNull();
  });
});

describe('Filters | avisos que impiden combinaciones inválidas (AC2.2.3)', () => {
  it('departamento sin municipio: avisa y deshabilita «Aplicar»', () => {
    renderFilters('es');
    expect(botonAplicar()).toBeEnabled();
    elegir(departamentoInput('es'), 'Antioquia');
    expect(screen.getByText('Elige también el municipio.')).toBeInTheDocument();
    expect(botonAplicar()).toBeDisabled();

    elegir(municipioInput('es'), 'Medellín');
    expect(screen.queryByText('Elige también el municipio.')).toBeNull();
    expect(botonAplicar()).toBeEnabled();
  });

  it('el aviso de ubicación también sale en inglés', () => {
    renderFilters('en');
    elegir(departamentoInput('en'), 'Antioquia');
    expect(screen.getByText('Please choose a municipality too.')).toBeInTheDocument();
  });

  it('precio mínimo mayor que el máximo: avisa y deshabilita «Aplicar»', () => {
    renderFilters('es');
    escribir('Mín', '900000000');
    escribir('Máx', '100000');
    expect(
      screen.getByText('El precio mínimo no puede ser mayor que el máximo.'),
    ).toBeInTheDocument();
    expect(botonAplicar()).toBeDisabled();

    escribir('Máx', '900000000');
    expect(botonAplicar()).toBeEnabled();
  });

  it('precio negativo: avisa el formato', () => {
    renderFilters('es');
    escribir('Mín', '-5');
    expect(
      screen.getByText('Escribe precios enteros, sin signo ni decimales.'),
    ).toBeInTheDocument();
    expect(botonAplicar()).toBeDisabled();
  });

  it('con una combinación inválida «Aplicar» no escribe la URL', () => {
    renderFilters('es');
    elegir(departamentoInput('es'), 'Antioquia');
    fireEvent.click(botonAplicar());
    expect(pushState).not.toHaveBeenCalled();
  });
});

describe('Filters | limpiar', () => {
  it('«Limpiar» vacía también el texto de los selectores de frontend', () => {
    renderFilters('es');
    const dormitorios = screen.getByPlaceholderText('Dormitorios mín.') as HTMLInputElement;
    elegir(dormitorios, '2+');
    expect(dormitorios.value).toBe('2+');

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar', exact: true }));
    expect(dormitorios.value).toBe('');
  });
});

describe('Filters | limpiar', () => {
  it('«Limpiar» escribe la ruta sin filtros', () => {
    renderFilters('es');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(pushState).toHaveBeenCalledWith(null, '', window.location.pathname);
  });
});
