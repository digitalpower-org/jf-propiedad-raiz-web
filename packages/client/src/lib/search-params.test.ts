import { describe, expect, it } from 'vitest';
import { aURLSearchParams } from './search-params';

// AC2.2.12: el servidor lee los filtros de `searchParams` (que Next entrega como objeto) con las
// mismas funciones que el cliente, que lee de `URLSearchParams`.

describe('aURLSearchParams', () => {
  it('copia los valores de texto', () => {
    const params = aURLSearchParams({ tipo: 'CASA', estrato: '3' });
    expect(params.get('tipo')).toBe('CASA');
    expect(params.get('estrato')).toBe('3');
  });

  it('con un valor repetido conserva el primero', () => {
    expect(aURLSearchParams({ tipo: ['CASA', 'FINCA'] }).get('tipo')).toBe('CASA');
  });

  it('ignora los valores indefinidos y las listas vacías', () => {
    const params = aURLSearchParams({ tipo: undefined, municipio: [] });
    expect(params.has('tipo')).toBe(false);
    expect(params.has('municipio')).toBe(false);
  });

  it('conserva los valores vacíos como texto vacío', () => {
    expect(aURLSearchParams({ tipo: '' }).get('tipo')).toBe('');
  });

  it('sin parámetros devuelve una consulta vacía', () => {
    expect(aURLSearchParams({}).toString()).toBe('');
  });
});
