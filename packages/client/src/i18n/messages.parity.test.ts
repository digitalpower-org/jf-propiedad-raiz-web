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

/** Claves que pueden contener arrays de objetos (no solo strings) */
const OBJECT_ARRAY_KEYS = new Set(['about.sections', 'about.equipo', 'home.servicesPreview']);

function isObjectArrayKey(path: string): boolean {
  return OBJECT_ARRAY_KEYS.has(path);
}

describe('paridad de diccionarios (AC0.4.4)', () => {
  it('español e inglés tienen exactamente las mismas claves', () => {
    const esPaths = collectPaths(es as Json).sort();
    const enPaths = collectPaths(en as Json).sort();

    expect(enPaths).toEqual(esPaths);
  });

  it('ninguna cadena queda vacía (las listas pueden ser arrays de strings u objetos)', () => {
    for (const [name, dictionary] of Object.entries({ es, en })) {
      for (const path of collectPaths(dictionary as Json)) {
        const value = path.split('.').reduce<Json | undefined>((current, segment) => {
          if (current === undefined || typeof current !== 'object' || current === null) {
            return undefined;
          }
          if (Array.isArray(current)) return current[Number(segment)];
          return current[segment];
        }, dictionary as Json);

        // Allow arrays (for list-type content like legal pages, about sections, equipo)
        if (Array.isArray(value)) {
          expect(value.length, `${name}:${path} - array should not be empty`).toBeGreaterThan(0);
          if (isObjectArrayKey(path)) {
            // Arrays of objects: check each object has required string fields
            for (const item of value) {
              expect(typeof item, `${name}:${path} - array items should be objects`).toBe('object');
              expect(item, `${name}:${path} - array items should not be null`).not.toBeNull();
            }
          } else {
            // Arrays of strings: check each item is non-empty string
            for (const item of value) {
              expect(typeof item, `${name}:${path} - array items should be strings`).toBe('string');
              expect(
                String(item).trim(),
                `${name}:${path} - array items should not be empty`,
              ).not.toBe('');
            }
          }
        } else {
          expect(typeof value, `${name}:${path}`).toBe('string');
          expect(String(value).trim(), `${name}:${path}`).not.toBe('');
        }
      }
    }
  });

  it('los diccionarios no comparten el mismo texto salvo nombres propios', () => {
    expect(en.home.title).not.toBe(es.home.title);
    expect(en.home.intro).not.toBe(es.home.intro);
  });
});
