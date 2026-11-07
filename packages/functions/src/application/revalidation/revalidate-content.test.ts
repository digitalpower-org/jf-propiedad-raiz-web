import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RevalidationGateway } from '../ports/revalidation-gateway';
import { RevalidateContent } from './revalidate-content';

const mockLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};

const mockRevalidate = vi.fn();

const makeGateway = (): RevalidationGateway => ({ revalidate: mockRevalidate });

const makeDeps = () => ({
  gateway: makeGateway(),
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
    const { gateway, logger } = makeDeps();
    const rc = new RevalidateContent({ gateway, logger });

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
    const { gateway } = makeDeps();
    const rc = new RevalidateContent({ gateway, logger: mockLogger });

    await rc.revalidate('servicios');

    expect(mockRevalidate).toHaveBeenCalledWith({
      paths: ['/es/servicios', '/en/services'],
      tags: ['servicios'],
    });
  });

  it('nosotros mapea a paths y tags de nosotros y portada', async () => {
    const { gateway } = makeDeps();
    const rc = new RevalidateContent({ gateway, logger: mockLogger });

    await rc.revalidate('nosotros');

    expect(mockRevalidate).toHaveBeenCalledWith({
      paths: ['/es/nosotros', '/en/about-us', '/es', '/en'],
      tags: ['nosotros', 'portada'],
    });
  });

  it('si la revalidación falla, registra el error y devuelve ok=false', async () => {
    const { gateway } = makeDeps();
    mockRevalidate.mockResolvedValue({ ok: false });
    const rc = new RevalidateContent({ gateway, logger: mockLogger });

    const result = await rc.revalidate('propiedades');

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'revalidation_failed',
      undefined,
      expect.objectContaining({ resource: 'propiedades' }),
    );
  });
});
