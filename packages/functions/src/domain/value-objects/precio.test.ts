import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import { parsePrecio } from './precio';

describe('parsePrecio', () => {
  it('acepta precio entero positivo', () => {
    expect(parsePrecio(100000)).toBe(100000);
  });

  it('acepta precio 1', () => {
    expect(parsePrecio(1)).toBe(1);
  });

  it('rechaza precio decimal', () => {
    expect(() => parsePrecio(1000.5)).toThrow(ZodError);
  });

  it('rechasa precio cero', () => {
    expect(() => parsePrecio(0)).toThrow(ZodError);
  });

  it('rechaza precio negativo', () => {
    expect(() => parsePrecio(-1)).toThrow(ZodError);
  });

  it('rechaza valores que no son número', () => {
    expect(() => parsePrecio('1000')).toThrow(ZodError);
    expect(() => parsePrecio(null)).toThrow(ZodError);
    expect(() => parsePrecio(undefined)).toThrow(ZodError);
  });
});
