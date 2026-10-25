import { describe, expect, it } from 'vitest';

import { negotiateLocale } from './negotiate';

describe('negociación de Accept-Language (AC0.4.2)', () => {
  it('sin cabecera usa el idioma por defecto', () => {
    expect(negotiateLocale(null)).toBe('es');
    expect(negotiateLocale('')).toBe('es');
    expect(negotiateLocale('   ')).toBe('es');
  });

  it('elige el idioma soportado con mayor peso', () => {
    expect(negotiateLocale('en-US,en;q=0.9')).toBe('en');
    expect(negotiateLocale('es-CO,es;q=0.9,en;q=0.8')).toBe('es');
    expect(negotiateLocale('fr-FR,fr;q=0.9,en;q=0.8')).toBe('en');
  });

  it('ignora idiomas no soportados y cae en el idioma por defecto', () => {
    expect(negotiateLocale('fr-FR,fr;q=0.9')).toBe('es');
    expect(negotiateLocale('de,it;q=0.5')).toBe('es');
  });

  it('descarta entradas con q=0', () => {
    expect(negotiateLocale('en;q=0,es;q=0.1')).toBe('es');
    expect(negotiateLocale('en;q=0')).toBe('es');
  });

  it('tolera pesos malformados sin romper', () => {
    expect(negotiateLocale('en;q=abc')).toBe('es');
  });
});
