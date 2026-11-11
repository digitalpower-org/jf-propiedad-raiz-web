import { describe, expect, it } from 'vitest';

import { translatableSchema, optionalTranslatableSchema } from './translatable';

describe('translatableSchema', () => {
  it('acepta un objeto con es y en', () => {
    const result = translatableSchema.safeParse({ es: 'Hola', en: 'Hello' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ es: 'Hola', en: 'Hello' });
    }
  });

  it('acepta un objeto solo con es', () => {
    const result = translatableSchema.safeParse({ es: 'Hola' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ es: 'Hola' });
    }
  });

  it('rechaza es vacío', () => {
    const result = translatableSchema.safeParse({ es: '' });
    expect(result.success).toBe(false);
  });

  it('rechaza cuando es falta', () => {
    const result = translatableSchema.safeParse({ en: 'Hello' });
    expect(result.success).toBe(false);
  });
});

describe('optionalTranslatableSchema', () => {
  it('acepta undefined', () => {
    const result = optionalTranslatableSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('acepta un objeto translatable válido', () => {
    const result = optionalTranslatableSchema.safeParse({ es: 'Hola', en: 'Hello' });
    expect(result.success).toBe(true);
  });

  it('rechaza es vacío', () => {
    const result = optionalTranslatableSchema.safeParse({ es: '' });
    expect(result.success).toBe(false);
  });
});
