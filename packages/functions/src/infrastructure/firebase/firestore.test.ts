import { describe, expect, it, vi } from 'vitest';
import type { App } from 'firebase-admin/app';

import { createFirestore } from './firestore';

const mocks = vi.hoisted(() => ({ getFirestore: vi.fn() }));

vi.mock('firebase-admin/firestore', () => ({ getFirestore: mocks.getFirestore }));

describe('createFirestore', () => {
  it('obtiene Firestore para la app recibida', () => {
    const app = { name: 'app' } as unknown as App;
    const db = { name: 'db' };
    mocks.getFirestore.mockReturnValue(db);

    expect(createFirestore(app)).toBe(db);
    expect(mocks.getFirestore).toHaveBeenCalledWith(app);
  });
});
