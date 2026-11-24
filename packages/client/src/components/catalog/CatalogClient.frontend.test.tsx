import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CatalogClient } from './CatalogClient';

// Los filtros de frontend se leen de la URL y llegan a PropertyGrid aparte de los de la API (D9).
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

describe('CatalogClient | filtros de frontend', () => {
  beforeEach(() => {
    mocks.grid.mockClear();
  });

  it('los cuatro filtros de la URL llegan como números a frontendFilters, no a la API', () => {
    const props = propsDelGrid('dormitorios=2&banos=1&areaMin=80&estrato=3');
    expect(props.frontendFilters).toEqual({ dormitorios: 2, banos: 1, areaMin: 80, estrato: 3 });
    expect(props.filters).toEqual({});
  });

  it('los filtros de base de datos no llegan a frontendFilters', () => {
    const props = propsDelGrid('tipo=CASA&dormitorios=3');
    expect(props.filters).toEqual({ tipo: 'CASA' });
    expect(props.frontendFilters).toEqual({ dormitorios: 3 });
  });

  it('sin filtros de frontend, todos quedan sin definir', () => {
    const props = propsDelGrid('tipo=CASA');
    expect(Object.values(props.frontendFilters as object).every((v) => v === undefined)).toBe(true);
  });

  it('un valor inválido en la URL se ignora', () => {
    const props = propsDelGrid('dormitorios=abc&estrato=9');
    expect(Object.values(props.frontendFilters as object).every((v) => v === undefined)).toBe(true);
  });
});
