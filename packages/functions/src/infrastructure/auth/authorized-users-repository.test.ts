import { describe, expect, it, vi } from 'vitest';

import { createFirestoreAuthorizedUsersRepository } from './authorized-users-repository';

function makeDb(doc: { exists: boolean; data(): unknown }) {
  const get = vi.fn().mockResolvedValue(doc);
  const docRef = vi.fn().mockReturnValue({ get });
  return { db: { doc: docRef }, docRef, get };
}

describe('createFirestoreAuthorizedUsersRepository', () => {
  it('devuelve un usuario activo normalizando el correo', async () => {
    const { db, docRef } = makeDb({
      exists: true,
      data: () => ({ email: 'Admin@Example.com', role: 'admin', active: true }),
    });
    const repository = createFirestoreAuthorizedUsersRepository(db);

    const result = await repository.findActiveByEmail('Admin@Example.com');

    expect(docRef).toHaveBeenCalledWith('authorized_users/admin@example.com');
    expect(result).toEqual({ email: 'Admin@Example.com', role: 'admin' });
  });

  it('devuelve null si el documento no existe', async () => {
    const { db } = makeDb({ exists: false, data: () => undefined });
    const repository = createFirestoreAuthorizedUsersRepository(db);

    await expect(repository.findActiveByEmail('admin@example.com')).resolves.toBeNull();
  });

  it('devuelve null si el usuario está inactivo', async () => {
    const { db } = makeDb({
      exists: true,
      data: () => ({ email: 'admin@example.com', role: 'admin', active: false }),
    });
    const repository = createFirestoreAuthorizedUsersRepository(db);

    await expect(repository.findActiveByEmail('admin@example.com')).resolves.toBeNull();
  });

  it('devuelve null si los datos no cumplen el esquema', async () => {
    const { db } = makeDb({ exists: true, data: () => ({ email: 'admin@example.com' }) });
    const repository = createFirestoreAuthorizedUsersRepository(db);

    await expect(repository.findActiveByEmail('admin@example.com')).resolves.toBeNull();
  });

  it('propaga errores de Firestore', async () => {
    const get = vi.fn().mockRejectedValue(new Error('firestore down'));
    const db = { doc: vi.fn().mockReturnValue({ get }) };
    const repository = createFirestoreAuthorizedUsersRepository(db);

    await expect(repository.findActiveByEmail('admin@example.com')).rejects.toThrow(
      'firestore down',
    );
  });
});
