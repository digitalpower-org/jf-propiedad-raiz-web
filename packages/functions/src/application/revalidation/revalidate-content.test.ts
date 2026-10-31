// RevalidateContent tests (5.4)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RevalidationClient } from '../../infrastructure/revalidation/revalidation-client';
import { RevalidateContent } from './revalidate-content';

const mockLogger = {
  requestId: 'test-123',
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

const mockRevalidate = vi.fn();

const makeClient = (): RevalidationClient => {
  const client = {
    revalidate: mockRevalidate,
  } as unknown as RevalidationClient;
  return client;
};

const makeDeps = () => ({
  client: makeClient(),
  logger: mockLogger,
});

describe('RevalidateContent (5.4)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRevalidate.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('propiedades mapea a paths y tags de listado + destacados', async () => {
    const { client, logger } = makeDeps();
    const rc = new RevalidateContent({ client, logger });

    await rc.revalidate('propiedades');

    expect(mockRevalidate).toHaveBeenCalledWith({
      paths: [
        '/es',
        '/en',
        '/es/venta',
        '/en/sale',
        '/es/alquiler',
        '/en/rent',
        '/es/proyectos',
        '/en/projects',
      ],
      tags: ['propiedades', 'listado', 'destacadas'],
    });
  });

  it('servicios mapea a paths y tags de servicios', async () => {
    const { client } = makeDeps();
    const rc = new RevalidateContent({ client, logger: mockLogger });

    await rc.revalidate('servicios');

    expect(mockRevalidate).toHaveBeenCalledWith({
      paths: ['/es/servicios', '/en/services'],
      tags: ['servicios'],
    });
  });

  it('nosotros mapea a paths y tags de nosotros y portada', async () => {
    const { client } = makeDeps();
    const rc = new RevalidateContent({ client, logger: mockLogger });

    await rc.revalidate('nosotros');

    expect(mockRevalidate).toHaveBeenCalledWith({
      paths: ['/es/nosotros', '/en/about-us', '/es', '/en'],
      tags: ['nosotros', 'portada'],
    });
  });

  it('si la revalidación falla, registra el error y devuelve ok=false', async () => {
    const { client } = makeDeps();
    mockRevalidate.mockResolvedValue({ ok: false });
    const rc = new RevalidateContent({ client, logger: mockLogger });

    const result = await rc.revalidate('propiedades');

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'revalidation_failed',
      expect.objectContaining({ resource: 'propiedades' }),
    );
  });
});

describe('createRevalidateContent factory', () => {
  it('crea una instancia con el client y logger dados', () => {
    const { client } = makeDeps();
    const rc = new RevalidateContent({ client, logger: mockLogger });
    expect(rc).toBeInstanceOf(RevalidateContent);
  });
});
