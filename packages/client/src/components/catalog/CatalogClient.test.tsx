import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CatalogClient } from './CatalogClient';

// CatalogClient deriva los filtros de la URL (AC2.2.2) y solo manda a la API los de base de
// datos y válidos (AC2.2.3). Aquí se comprueba lo que recibe PropertyGrid.
const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  grid: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  useRouter: () => ({ push: () => {} }),
}));
vi.mock('@/components/catalog/Filters', () => ({ Filters: () => null }));
vi.mock('@/components/catalog/PropertyGrid', () => ({
  PropertyGrid: (props: unknown) => {
    mocks.grid(props);
    return null;
  },
}));

function propsDelGrid(consulta: string) {
  mocks.searchParams = new URLSearchParams(consulta);
  render(<CatalogClient operacion="VENTA" locale="es" />);
  return mocks.grid.mock.lastCall?.[0] as { filters: unknown; frontendFilters: unknown };
}

describe('CatalogClient | filtros derivados de la URL', () => {
  beforeEach(() => {
    mocks.grid.mockClear();
  });

  it('sin filtros: filtros vacíos y la rejilla no recibe datos iniciales (llegan hidratados)', () => {
    const props = propsDelGrid('');
    expect(props.filters).toEqual({});
    expect(props).not.toHaveProperty('initialData');
  });

  it('con un filtro de base de datos lo manda a la API', () => {
    expect(propsDelGrid('tipo=CASA').filters).toEqual({ tipo: 'CASA' });
  });

  it('de una lista de tipos manda solo el primero', () => {
    expect(propsDelGrid('tipo=CASA,FINCA').filters).toEqual({ tipo: 'CASA' });
  });

  it('departamento sin municipio no llega a la API', () => {
    expect(propsDelGrid('departamento=Antioquia').filters).toEqual({});
  });

  it('ubicación completa y precios válidos sí llegan', () => {
    expect(
      propsDelGrid('departamento=Antioquia&municipio=Medell%C3%ADn&precioMin=100&precioMax=900')
        .filters,
    ).toEqual({ departamento: 'Antioquia', municipio: 'Medellín', precioMin: 100, precioMax: 900 });
  });

  it('un rango de precio invertido no llega a la API', () => {
    expect(propsDelGrid('precioMin=900&precioMax=100').filters).toEqual({});
  });

  it('los filtros de frontend nunca llegan a la API', () => {
    const props = propsDelGrid('dormitorios=2&banos=1&areaMin=80&estrato=3');
    expect(props.filters).toEqual({});
    expect(props.frontendFilters).toEqual(
      expect.objectContaining({ dormitorios: 2, banos: 1, areaMin: 80, estrato: 3 }),
    );
  });
});
