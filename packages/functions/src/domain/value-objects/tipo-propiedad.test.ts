import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { parseTipoPropiedad } from './tipo-propiedad';

describe('parseTipoPropiedad', () => {
  it.each([
    'CASA',
    'APARTAMENTO',
    'LOTE_CAMPESTRE',
    'LOTE_URBANO',
    'FINCA',
    'LOCAL_COMERCIAL',
    'BODEGA',
    'OFICINA',
  ])('acepta %s', (tipo) => {
    expect(parseTipoPropiedad(tipo)).toBe(tipo);
  });

  it('rechaza tipo inexistente', () => {
    expect(() => parseTipoPropiedad('TERRENO')).toThrow(ZodError);
  });

  it('rechaza valores que no son texto', () => {
    expect(() => parseTipoPropiedad(1)).toThrow(ZodError);
    expect(() => parseTipoPropiedad(null)).toThrow(ZodError);
    expect(() => parseTipoPropiedad(undefined)).toThrow(ZodError);
  });
});
