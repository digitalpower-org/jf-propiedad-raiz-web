import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BFF_URL,
  DEFAULT_FIREBASE_PROJECT_ID,
  loadEnv,
} from './env';

const KEY = 'x'.repeat(32);

describe('loadEnv', () => {
  it('parsea la configuración completa', () => {
    const config = loadEnv({
      BFF_INTERNAL_KEY: KEY,
      BFF_URL: 'https://bff.example.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'custom-project',
      TRANSLATOR_FAKE: '1',
    });

    expect(config).toEqual({
      internalKey: KEY,
      bffUrl: 'https://bff.example.com',
      firebaseProjectId: 'custom-project',
      useFakeTranslator: true,
    });
  });

  it('aplica valores por defecto', () => {
    const config = loadEnv({ BFF_INTERNAL_KEY: KEY });

    expect(config.bffUrl).toBe(DEFAULT_BFF_URL);
    expect(config.firebaseProjectId).toBe(DEFAULT_FIREBASE_PROJECT_ID);
    expect(config.useFakeTranslator).toBe(false);
  });

  it('solo considera traductor falso cuando TRANSLATOR_FAKE === "1"', () => {
    expect(loadEnv({ BFF_INTERNAL_KEY: KEY, TRANSLATOR_FAKE: 'true' }).useFakeTranslator).toBe(
      false,
    );
  });

  it('rechaza una clave interna ausente', () => {
    expect(() => loadEnv({})).toThrow(/Configuración de entorno inválida: BFF_INTERNAL_KEY/);
  });

  it('rechaza una clave interna demasiado corta', () => {
    expect(() => loadEnv({ BFF_INTERNAL_KEY: 'short' })).toThrow(
      /Configuración de entorno inválida: BFF_INTERNAL_KEY/,
    );
  });

  it('rechaza una BFF_URL inválida', () => {
    expect(() => loadEnv({ BFF_INTERNAL_KEY: KEY, BFF_URL: 'not-a-url' })).toThrow(
      /Configuración de entorno inválida: BFF_URL/,
    );
  });
});
