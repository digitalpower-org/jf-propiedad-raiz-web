import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'firebase-admin/app';

import type { AppConfig } from '../config/env';
import { getAdminApp } from './admin-app';

const mocks = vi.hoisted(() => ({
  getApps: vi.fn(),
  initializeApp: vi.fn(),
  app: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({ getApps: mocks.getApps }));
vi.mock('firebase-admin', () => ({
  initializeApp: mocks.initializeApp,
  app: mocks.app,
}));

const config: AppConfig = {
  internalKey: 'x'.repeat(32),
  bffUrl: 'https://bff.example.com',
  firebaseProjectId: 'project-1',
  useFakeTranslator: true,
};

describe('getAdminApp', () => {
  const originalEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if (originalEmulatorHost === undefined) {
      delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    } else {
      process.env.FIREBASE_AUTH_EMULATOR_HOST = originalEmulatorHost;
    }
  });

  it('inicializa la app cuando no existe ninguna', () => {
    const app = { name: 'app' } as unknown as App;
    mocks.getApps.mockReturnValue([]);
    mocks.app.mockReturnValue(app);

    const result = getAdminApp(config);

    expect(mocks.initializeApp).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(mocks.app).toHaveBeenCalledTimes(1);
    expect(result).toBe(app);
  });

  it('reutiliza la app existente sin reinicializar', () => {
    const app = { name: 'app' } as unknown as App;
    mocks.getApps.mockReturnValue([app]);
    mocks.app.mockReturnValue(app);

    const result = getAdminApp(config);

    expect(mocks.initializeApp).not.toHaveBeenCalled();
    expect(result).toBe(app);
  });

  it('elimina FIREBASE_AUTH_EMULATOR_HOST antes de inicializar', () => {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
    mocks.getApps.mockReturnValue([]);
    mocks.app.mockReturnValue({} as App);

    getAdminApp(config);

    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toBeUndefined();
  });
});
