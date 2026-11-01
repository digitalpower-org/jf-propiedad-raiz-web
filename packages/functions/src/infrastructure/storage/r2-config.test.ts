// R2 configuration validation tests (4.2)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';

vi.mock('server-only', () => ({}));

const ENV_KEYS = [
  'R2_ENDPOINT',
  'R2_REGION',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
] as const;

type EnvKey = (typeof ENV_KEYS)[number];

const VALID_ENV: Record<EnvKey, string> = {
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

async function importConfig(): Promise<typeof import('./r2-config.js')> {
  vi.resetModules();
  return import('./r2-config.js');
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

describe('r2Config (4.2)', () => {
  it('expone la configuración completa cuando todas las variables son válidas', async () => {
    applyEnv();

    const { r2Config } = await importConfig();

    expect(r2Config).toEqual({
      endpoint: VALID_ENV.R2_ENDPOINT,
      region: VALID_ENV.R2_REGION,
      accessKeyId: VALID_ENV.R2_ACCESS_KEY_ID,
      secretAccessKey: VALID_ENV.R2_SECRET_ACCESS_KEY,
      bucket: VALID_ENV.R2_BUCKET,
      publicBaseUrl: VALID_ENV.R2_PUBLIC_BASE_URL,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it.each(ENV_KEYS)('lanza error cuando falta %s', async (key) => {
    applyEnv({ [key]: undefined });

    await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');

    expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Configuración de R2 inválida:');
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes(key))).toBe(true);
  });

  it.each(ENV_KEYS)('lanza error cuando %s está vacía', async (key) => {
    applyEnv({ [key]: '' });

    await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');
  });

  it('rechaza R2_ENDPOINT que no es una URL', async () => {
    applyEnv({ R2_ENDPOINT: 'no-es-una-url' });

    await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('R2_ENDPOINT'))).toBe(true);
  });

  it('rechaza R2_PUBLIC_BASE_URL que no es una URL', async () => {
    applyEnv({ R2_PUBLIC_BASE_URL: 'media.example.com' });

    await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');
    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('R2_PUBLIC_BASE_URL'))).toBe(true);
  });

  it('usa "(root)" cuando el problema no tiene ruta asociada', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(process, 'env');
    // Un valor no-objeto (array) hace que Zod emita un issue a nivel raíz,
    // sin ruta, para cubrir el fallback de formato del mensaje.
    Object.defineProperty(process, 'env', { value: [], configurable: true });

    try {
      await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(process, 'env', originalDescriptor);
      }
    }

    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    expect(messages.some((message) => message.includes('(root):'))).toBe(true);
  });

  it('registra todas las variables inválidas en un único error', async () => {
    applyEnv({
      R2_ENDPOINT: 'no-es-una-url',
      R2_REGION: '',
      R2_ACCESS_KEY_ID: undefined,
      R2_SECRET_ACCESS_KEY: undefined,
      R2_BUCKET: undefined,
      R2_PUBLIC_BASE_URL: 'no-es-una-url',
    });

    await expect(importConfig()).rejects.toThrow('Fallo al validar variables de entorno de R2.');

    const messages = consoleErrorSpy.mock.calls.map((call) => String(call[0]));
    for (const key of ENV_KEYS) {
      expect(messages.some((message) => message.includes(key))).toBe(true);
    }
  });
});
