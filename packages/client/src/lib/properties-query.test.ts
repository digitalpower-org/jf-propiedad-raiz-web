import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, getNextPropertiesPageParam, propertiesQueryKey } from './properties-query';

// AC2.2.12: el hook del cliente y el prefetch del servidor comparten clave y paginación.

const base = { operacion: 'VENTA', destacada: true } as const;

describe('propertiesQueryKey', () => {
  it('sin filtros: operación, destacada, clave de filtros vacía y cursor', () => {
    expect(propertiesQueryKey(base)).toEqual(['properties', 'VENTA', true, '||||', undefined]);
  });

  it('con todos los filtros de base de datos', () => {
    const clave = propertiesQueryKey({
      ...base,
      tipo: 'CASA',
      departamento: 'Antioquia',
      municipio: 'Medellín',
      precioMin: 100,
      precioMax: 900,
    });
    expect(clave).toEqual([
      'properties',
      'VENTA',
      true,
      'CASA|Antioquia|Medellín|100|900',
      undefined,
    ]);
  });

  it('cambiar un filtro cambia la clave', () => {
    expect(propertiesQueryKey({ ...base, tipo: 'CASA' })).not.toEqual(
      propertiesQueryKey({ ...base, tipo: 'FINCA' }),
    );
  });

  it('destacadas y no destacadas son consultas distintas', () => {
    expect(propertiesQueryKey(base)).not.toEqual(propertiesQueryKey({ ...base, destacada: false }));
  });

  it('el tamaño de página no forma parte de la clave', () => {
    expect(propertiesQueryKey({ ...base, limit: 12 })).toEqual(
      propertiesQueryKey({ ...base, limit: 50 }),
    );
  });

  it('el cursor forma parte de la clave', () => {
    expect(propertiesQueryKey({ ...base, cursor: 'c1' })).toEqual([
      'properties',
      'VENTA',
      true,
      '||||',
      'c1',
    ]);
  });
});

describe('PAGE_SIZE', () => {
  it('el catálogo pide páginas de 12', () => {
    expect(PAGE_SIZE).toBe(12);
  });
});

describe('getNextPropertiesPageParam', () => {
  it('devuelve el cursor de la página siguiente', () => {
    expect(
      getNextPropertiesPageParam({ success: true, data: { items: [], nextCursor: 'c1' } }),
    ).toBe('c1');
  });

  it('sin cursor siguiente devuelve undefined', () => {
    expect(
      getNextPropertiesPageParam({ success: true, data: { items: [], nextCursor: null } }),
    ).toBeUndefined();
  });

  it('una respuesta de error devuelve undefined', () => {
    expect(
      getNextPropertiesPageParam({ success: false, data: { code: 'RATE_LIMITED' }, message: 'x' }),
    ).toBeUndefined();
  });
});
