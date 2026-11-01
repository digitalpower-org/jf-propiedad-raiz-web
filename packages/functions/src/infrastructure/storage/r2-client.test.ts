// R2 S3Client construction tests (4.3)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { S3ClientMock } = vi.hoisted(() => {
  const instanceConfigs: unknown[] = [];
  const S3ClientMock = vi.fn(function (this: { constructorConfig: unknown }, config: unknown) {
    this.constructorConfig = config;
    instanceConfigs.push(config);
  });

  return { S3ClientMock, instanceConfigs };
});

vi.mock('@aws-sdk/client-s3', () => ({ S3Client: S3ClientMock }));
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

async function importClient(): Promise<typeof import('./r2-client.js')> {
  vi.resetModules();
  return import('./r2-client.js');
}

beforeEach(() => {
  applyEnv();
  S3ClientMock.mockClear();
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
  vi.resetModules();
});

describe('r2Client (4.3)', () => {
  it('construye un S3Client con la configuración de R2', async () => {
    const { r2Client } = await importClient();

    expect(S3ClientMock).toHaveBeenCalledTimes(1);
    expect(S3ClientMock).toHaveBeenCalledWith({
      region: VALID_ENV.R2_REGION,
      endpoint: VALID_ENV.R2_ENDPOINT,
      forcePathStyle: true,
      credentials: {
        accessKeyId: VALID_ENV.R2_ACCESS_KEY_ID,
        secretAccessKey: VALID_ENV.R2_SECRET_ACCESS_KEY,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
    expect(r2Client).toBeDefined();
  });

  it('reutiliza la misma instancia en importaciones posteriores', async () => {
    const first = await importClient();
    const second = await import('./r2-client.js');

    expect(second.r2Client).toBe(first.r2Client);
    expect(S3ClientMock).toHaveBeenCalledTimes(1);
  });
});
