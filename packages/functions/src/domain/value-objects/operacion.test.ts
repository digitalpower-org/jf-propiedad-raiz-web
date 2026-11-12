import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { parseOperacion } from './operacion';

describe('parseOperacion', () => {
  it('acepta VENTA', () => {
    expect(parseOperacion('VENTA')).toBe('VENTA');
  });

  it('acepta ALQUILER', () => {
    expect(parseOperacion('ALQUILER')).toBe('ALQUILER');
  });

  it('acepta PROYECTO_SOBRE_PLANOS', () => {
    expect(parseOperacion('PROYECTO_SOBRE_PLANOS')).toBe('PROYECTO_SOBRE_PLANOS');
  });

  it('rechaza operación inexistente', () => {
    expect(() => parseOperacion('OTRA')).toThrow(ZodError);
  });

  it('rechaza valores que no son texto', () => {
    expect(() => parseOperacion(1)).toThrow(ZodError);
    expect(() => parseOperacion(null)).toThrow(ZodError);
    expect(() => parseOperacion(undefined)).toThrow(ZodError);
  });
});
