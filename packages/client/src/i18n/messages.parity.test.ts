import { describe, expect, it } from 'vitest';

import en from '../../messages/en.json';
import es from '../../messages/es.json';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Rutas de claves en notación de punto; los arrays se recorren por índice. */
function collectPaths(value: Json, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    collectPaths(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

describe('paridad de diccionarios (AC0.4.4)', () => {
  it('español e inglés tienen exactamente las mismas claves', () => {
    const esPaths = collectPaths(es as Json).sort();
    const enPaths = collectPaths(en as Json).sort();

    expect(enPaths).toEqual(esPaths);
  });

  it('ninguna cadena queda vacía', () => {
    for (const [name, dictionary] of Object.entries({ es, en })) {
      for (const path of collectPaths(dictionary as Json)) {
        const value = path.split('.').reduce<Json | undefined>((current, segment) => {
          if (current === undefined || typeof current !== 'object' || current === null) {
            return undefined;
          }
          if (Array.isArray(current)) return current[Number(segment)];
          return current[segment];
        }, dictionary as Json);

        expect(typeof value, `${name}:${path}`).toBe('string');
        expect(String(value).trim(), `${name}:${path}`).not.toBe('');
      }
    }
  });

  it('los diccionarios no comparten el mismo texto salvo nombres propios', () => {
    expect(en.home.title).not.toBe(es.home.title);
    expect(en.home.intro).not.toBe(es.home.intro);
  });
});
