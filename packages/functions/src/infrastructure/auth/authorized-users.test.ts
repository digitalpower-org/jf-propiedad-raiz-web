import { beforeEach, describe, expect, it, vi } from 'vitest';

const { docMock, getMock, dataMock } = vi.hoisted(() => ({
  docMock: vi.fn(),
  getMock: vi.fn(),
  dataMock: vi.fn(),
}));

vi.mock('../firebase/admin', () => ({ db: { doc: docMock } }));

import { findAuthorizedUser } from './authorized-users';

describe('findAuthorizedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ exists: true, data: dataMock });
    docMock.mockReturnValue({ get: getMock });
  });

  it('devuelve el usuario cuando el documento autorizado existe', async () => {
    const authorized = { email: 'admin@test.local', role: 'admin', active: true };
    dataMock.mockReturnValue(authorized);

    const result = await findAuthorizedUser('admin@test.local');

    expect(result).toBe(authorized);
    expect(docMock).toHaveBeenCalledWith('authorized_users/admin@test.local');
    expect(dataMock).toHaveBeenCalledTimes(1);
  });

  it('usa el email en minúsculas como id del documento', async () => {
    dataMock.mockReturnValue({ email: 'mixed@test.local', role: 'editor', active: true });

    await findAuthorizedUser('Mixed@Test.Local');

    expect(docMock).toHaveBeenCalledWith('authorized_users/mixed@test.local');
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve null cuando el documento no existe', async () => {
    getMock.mockResolvedValue({ exists: false, data: dataMock });

    const result = await findAuthorizedUser('missing@test.local');

    expect(result).toBeNull();
    expect(docMock).toHaveBeenCalledWith('authorized_users/missing@test.local');
    expect(dataMock).not.toHaveBeenCalled();
  });

  it('propaga el error cuando Firestore rechaza la lectura', async () => {
    const failure = new Error('firestore unavailable');
    getMock.mockRejectedValue(failure);

    await expect(findAuthorizedUser('admin@test.local')).rejects.toBe(failure);
    expect(dataMock).not.toHaveBeenCalled();
  });
});
