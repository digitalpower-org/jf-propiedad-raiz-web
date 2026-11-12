import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { parseSlug } from './slug';

describe('parseSlug', () => {
  it('acepta slug válido minúsculas con guiones', () => {
    expect(parseSlug('casa-en-venta')).toBe('casa-en-venta');
  });

  it('acepta slug con números', () => {
    expect(parseSlug('casa-123')).toBe('casa-123');
  });

  it('acepta slug de una sola palabra', () => {
    expect(parseSlug('casa')).toBe('casa');
  });

  it('rechaza slug vacío', () => {
    expect(() => parseSlug('')).toThrow(ZodError);
  });

  it('rechaza slug con espacios', () => {
    expect(() => parseSlug('casa en venta')).toThrow(ZodError);
  });

  it('rechaza slug con caracteres especiales', () => {
    expect(() => parseSlug('casa_en_venta')).toThrow(ZodError);
    expect(() => parseSlug('casa.en.venta')).toThrow(ZodError);
    expect(() => parseSlug('casa@venta')).toThrow(ZodError);
  });

  it('rechaza valores que no son texto', () => {
    expect(() => parseSlug(1)).toThrow(ZodError);
    expect(() => parseSlug(null)).toThrow(ZodError);
    expect(() => parseSlug(undefined)).toThrow(ZodError);
  });
});
