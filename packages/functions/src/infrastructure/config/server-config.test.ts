// Configuración centralizada del backend (patrón server-config.ts del client).
// Valida `process.env` una sola vez al cargar el módulo, por lo que las pruebas
// importan el módulo de forma dinámica tras fijar las variables de entorno.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

const ENV_KEYS = [
  'NODE_ENV',
  'BFF_INTERNAL_KEY',
  'BFF_URL',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'TRANSLATOR_FAKE',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'JUAN_EMAIL',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'R2_ENDPOINT',
  'R2_REGION',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const VALID_ENV: Record<EnvKey, string> = {
  NODE_ENV: 'test',
  BFF_INTERNAL_KEY: 'x'.repeat(32),
  BFF_URL: 'https://bff.example.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'custom-project',
  TRANSLATOR_FAKE: '1',
  RESEND_API_KEY: 're_resend_key',
  RESEND_FROM_EMAIL: 'consignaciones@jfpropiedadraiz.com',
  JUAN_EMAIL: 'juanfer@jfpropiedadraiz.com',
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  R2_ENDPOINT: 'https://account-id.r2.cloudflarestorage.com',
  R2_REGION: 'auto',
  R2_ACCESS_KEY_ID: 'access-key-id',
  R2_SECRET_ACCESS_KEY: 'secret-access-key',
  R2_BUCKET: 'jf-media',
  R2_PUBLIC_BASE_URL: 'https://media.example.com',
};

const originalEnv: Record<EnvKey, string | undefined> = {} as Record<EnvKey, string | undefined>;

for (const key of ENV_KEYS) {
  originalEnv[key] = process.env[key];
}

function applyEnv(overrides: Partial<Record<EnvKey, string | undefined>> = {}): void {
  for (const key of ENV_KEYS) {
    const value = Object.prototype.hasOwnProperty.call(overrides, key)
      ? overrides[key]
      : VALID_ENV[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function importConfig(): Promise<typeof import('./server-config.js')> {
  vi.resetModules();
  return import('./server-config.js');
}

let consoleErrorSpy: MockInstance<typeof console.error>;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  consoleErrorSpy.mockRestore();
  vi.resetModules();
});

describe('server-config', () => {
  it('expone la configuración completa cuando todas las variables son válidas', async () => {
    applyEnv();

    const { config, env } = await importConfig();

    expect(env).toEqual(VALID_ENV);
    expect(config).toEqual({
      nodeEnv: 'test',
      isProd: false,
      isDev: false,
      isTest: true,
      internalKey: VALID_ENV.BFF_INTERNAL_KEY,
      bffUrl: VALID_ENV.BFF_URL,
      firebaseProjectId: VALID_ENV.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      useFakeTranslator: true,
      resendApiKey: VALID_ENV.RESEND_API_KEY,
      resendFromEmail: VALID_ENV.RESEND_FROM_EMAIL,
      juanEmail: VALID_ENV.JUAN_EMAIL,
      firebaseAuthEmulatorHost: VALID_ENV.FIREBASE_AUTH_EMULATOR_HOST,
      r2: {
        endpoint: VALID_ENV.R2_ENDPOINT,
        region: VALID_ENV.R2_REGION,
        accessKeyId: VALID_ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: VALID_ENV.R2_SECRET_ACCESS_KEY,
        bucket: VALID_ENV.R2_BUCKET,
        publicBaseUrl: VALID_ENV.R2_PUBLIC_BASE_URL,
      },
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it.each([
    'BFF_INTERNAL_KEY',
    'RESEND_API_KEY',
    'R2_ENDPOINT',
    'R2_REGION',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_BASE_URL',
  ])('lanza error cuando falta %s', async (key) => {
    applyEnv({ [key]: undefined });

    await expect(importConfig()).rejects.toThrow(
      'Fallo al validar variables de entorno del backend.',
    );

    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes(key))).toBe(true);
  });

  it.each(['BFF_INTERNAL_KEY', 'RESEND_API_KEY', 'R2_REGION'])('rechaza %s vacía', async (key) => {
    applyEnv({ [key]: '' });

    await expect(importConfig()).rejects.toThrow(
      'Fallo al validar variables de entorno del backend.',
    );
  });

  it('rechaza BFF_INTERNAL_KEY demasiado corta', async () => {
    applyEnv({ BFF_INTERNAL_KEY: 'short' });

    await expect(importConfig()).rejects.toThrow(
      'Fallo al validar variables de entorno del backend.',
    );
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('BFF_INTERNAL_KEY'))).toBe(true);
  });

  it('rechaza R2_ENDPOINT que no es una URL', async () => {
    applyEnv({ R2_ENDPOINT: 'no-es-una-url' });

    await expect(importConfig()).rejects.toThrow(
      'Fallo al validar variables de entorno del backend.',
    );
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('R2_ENDPOINT'))).toBe(true);
  });

  it('aplica valores por defecto cuando las variables opcionales faltan', async () => {
    applyEnv({
      NODE_ENV: undefined,
      BFF_URL: undefined,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: undefined,
      TRANSLATOR_FAKE: undefined,
      RESEND_FROM_EMAIL: undefined,
      JUAN_EMAIL: undefined,
      FIREBASE_AUTH_EMULATOR_HOST: undefined,
    });

    const { config } = await importConfig();

    expect(config.nodeEnv).toBe('development');
    expect(config.isDev).toBe(true);
    expect(config.isProd).toBe(false);
    expect(config.isTest).toBe(false);
    expect(config.bffUrl).toBe('http://127.0.0.1:3000');
    expect(config.firebaseProjectId).toBe('jf-propiedad-raiz');
    expect(config.useFakeTranslator).toBe(false);
    expect(config.resendFromEmail).toBe('consignaciones@jfpropiedadraiz.com');
    expect(config.juanEmail).toBe('juanfer@jfpropiedadraiz.com');
    expect(config.firebaseAuthEmulatorHost).toBeUndefined();
  });

  it('rechaza JUAN_EMAIL que no es un correo válido', async () => {
    applyEnv({ JUAN_EMAIL: 'no-es-un-correo' });

    await expect(importConfig()).rejects.toThrow(
      'Fallo al validar variables de entorno del backend.',
    );
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('JUAN_EMAIL'))).toBe(true);
  });

  it('no falla si NODE_ENV es production, development o test', async () => {
    for (const nodeEnv of ['production', 'development', 'test'] as const) {
      applyEnv({ NODE_ENV: nodeEnv });
      const { config } = await importConfig();
      expect(config.nodeEnv).toBe(nodeEnv);
      expect(config.isProd).toBe(nodeEnv === 'production');
      expect(config.isDev).toBe(nodeEnv === 'development');
      expect(config.isTest).toBe(nodeEnv === 'test');
    }
  });
});
