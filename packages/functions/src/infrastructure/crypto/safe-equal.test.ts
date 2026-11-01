import { describe, expect, it } from 'vitest';
import { safeEqual } from './safe-equal';

describe('safeEqual', () => {
  it('devuelve true para cadenas idénticas', () => {
    expect(safeEqual('super-secret-key', 'super-secret-key')).toBe(true);
  });

  it('devuelve false para cadenas de la misma longitud pero distintas', () => {
    expect(safeEqual('super-secret-key', 'super-secret-keY')).toBe(false);
  });

  it('devuelve false para longitudes distintas sin lanzar excepción', () => {
    expect(() => safeEqual('short', 'much-longer-value')).not.toThrow();
    expect(safeEqual('short', 'much-longer-value')).toBe(false);
  });

  it('considera iguales dos cadenas vacías', () => {
    expect(safeEqual('', '')).toBe(true);
  });

  it('devuelve false al comparar una cadena vacía con una no vacía', () => {
    expect(safeEqual('', 'a')).toBe(false);
    expect(safeEqual('a', '')).toBe(false);
  });

  it('compara correctamente cadenas unicode', () => {
    expect(safeEqual('cláve-ñandú-🔐', 'cláve-ñandú-🔐')).toBe(true);
    expect(safeEqual('cláve-ñandú-🔐', 'clave-nandu-🔐')).toBe(false);
    expect(safeEqual('café', 'cafe\u0301')).toBe(false);
  });
});
