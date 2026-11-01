import { beforeEach, describe, expect, it, vi } from 'vitest';

const appModule = vi.hoisted(() => ({ getApps: vi.fn() }));
const adminModule = vi.hoisted(() => ({
  initializeApp: vi.fn(),
  app: vi.fn(),
  firestore: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({ getApps: appModule.getApps }));
vi.mock('firebase-admin', () => ({
  initializeApp: adminModule.initializeApp,
  app: adminModule.app,
  firestore: adminModule.firestore,
}));

interface FakeApp {
  readonly name: string;
}

interface FakeDb {
  readonly collection: ReturnType<typeof vi.fn>;
}

describe('admin', () => {
  let fakeApp: FakeApp;
  let fakeDb: FakeDb;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    fakeApp = { name: 'fake-admin-app' };
    fakeDb = { collection: vi.fn() };
    adminModule.app.mockReturnValue(fakeApp);
    adminModule.initializeApp.mockReturnValue(fakeApp);
    adminModule.firestore.mockReturnValue(fakeDb);
  });

  it('inicializa la app en arranque en frío y crea la instancia de firestore', async () => {
    appModule.getApps.mockReturnValue([]);

    const { db, getAdminApp } = await import('./admin.js');

    expect(adminModule.initializeApp).toHaveBeenCalledTimes(1);
    expect(adminModule.initializeApp).toHaveBeenCalledWith();
    expect(adminModule.app).toHaveBeenCalledTimes(1);
    expect(adminModule.firestore).toHaveBeenCalledWith(fakeApp);
    expect(db).toBe(fakeDb);
    expect(getAdminApp()).toBe(fakeApp);
  });

  it('reutiliza la app existente sin volver a inicializar', async () => {
    appModule.getApps.mockReturnValue([fakeApp]);

    const { db, getAdminApp } = await import('./admin.js');

    expect(adminModule.initializeApp).not.toHaveBeenCalled();
    expect(adminModule.firestore).toHaveBeenCalledWith(fakeApp);
    expect(db).toBe(fakeDb);
    expect(getAdminApp()).toBe(fakeApp);
    expect(adminModule.app).toHaveBeenCalledTimes(2);
  });
});
