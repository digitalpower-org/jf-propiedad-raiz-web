import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { setup, INTERNAL_KEY } from '../../testing/appBuilderTestHarness';
import { errorCode } from '../../../domain/errors/api-error';

const ADMIN_HEADERS = {
  'X-User-Id': 'uid-1',
  'X-User-Role': 'admin',
  'X-User-Email': 'admin@example.com',
};

describe('POST /api/v1/media/presigned-url (integration)', () => {
  it('responde 200 con URL presignada para MIME válido (image/jpeg)', async () => {
    const { app, mediaStorage, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });
    vi.mocked(mediaStorage.presignPut).mockResolvedValue({
      url: 'https://bucket.r2.cloudflarestorage.com/pending/abc-123.jpg',
      key: 'pending/abc-123.jpg',
      expiresInSeconds: 900,
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        url: expect.stringContaining('pending/'),
        key: expect.stringMatching(/^pending\/[a-f0-9-]+\.jpg$/),
        expiresInSeconds: 900,
      },
      message: 'URL presignada generada',
    });
    expect(mediaStorage.presignPut).toHaveBeenCalledWith('foto.jpg', 'image/jpeg');
  });

  it('responde 200 con URL presignada para MIME válido (image/png)', async () => {
    const { app, mediaStorage, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });
    vi.mocked(mediaStorage.presignPut).mockResolvedValue({
      url: 'https://bucket/pending/abc.png',
      key: 'pending/abc.png',
      expiresInSeconds: 900,
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.png', mimeType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.data.key).toMatch(/^pending\/[a-f0-9-]+\.png$/);
    expect(mediaStorage.presignPut).toHaveBeenCalledWith('foto.png', 'image/png');
  });

  it('responde 200 con URL presignada para MIME válido (image/webp)', async () => {
    const { app, mediaStorage, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });
    vi.mocked(mediaStorage.presignPut).mockResolvedValue({
      url: 'https://bucket/pending/abc.webp',
      key: 'pending/abc.webp',
      expiresInSeconds: 900,
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.webp', mimeType: 'image/webp' });

    expect(response.status).toBe(200);
    expect(response.body.data.key).toMatch(/^pending\/[a-f0-9-]+\.webp$/);
    expect(mediaStorage.presignPut).toHaveBeenCalledWith('foto.webp', 'image/webp');
  });

  it('responde 422 UNSUPPORTED_MEDIA para MIME inválido (image/gif)', async () => {
    const { app, mediaStorage, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.gif', mimeType: 'image/gif' });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      data: { code: errorCode.unsupportedMedia },
      message: 'Tipo MIME no soportado',
    });
    expect(mediaStorage.presignPut).not.toHaveBeenCalled();
  });

  it('responde 422 UNSUPPORTED_MEDIA para MIME inválido (video/mp4)', async () => {
    const { app, mediaStorage, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'video.mp4', mimeType: 'video/mp4' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe(errorCode.unsupportedMedia);
    expect(mediaStorage.presignPut).not.toHaveBeenCalled();
  });

  it('responde 422 VALIDATION_ERROR cuando falta nombre', async () => {
    const { app, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ mimeType: 'image/jpeg' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(response.body.data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'nombre' })]),
    );
  });

  it('responde 422 VALIDATION_ERROR cuando falta mimeType', async () => {
    const { app, identityVerifier, authorizedUsers } = setup();
    vi.mocked(identityVerifier.verify).mockResolvedValue({
      uid: 'uid-1',
      email: 'admin@example.com',
      emailVerified: true,
    });
    vi.mocked(authorizedUsers.findActiveByEmail).mockResolvedValue({
      email: 'admin@example.com',
      role: 'admin',
    });

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.jpg' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
    expect(response.body.data.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'mimeType' })]),
    );
  });

  it('responde 401 sin X-Internal-Key', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set(ADMIN_HEADERS)
      .send({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('responde 401 para usuario no admin (rol inválido)', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/api/v1/media/presigned-url')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set({
        'X-User-Id': 'uid-1',
        'X-User-Role': 'client',
        'X-User-Email': 'user@example.com',
      })
      .send({ nombre: 'foto.jpg', mimeType: 'image/jpeg' });

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });
});
