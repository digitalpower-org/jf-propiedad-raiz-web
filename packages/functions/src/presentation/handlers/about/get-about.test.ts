import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { INTERNAL_KEY, setup } from '../../testing/appBuilderTestHarness';
import { API_PATHS } from '../../paths';
import type { AboutDto } from '../../../application/ports/about-repository';

const seed: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeAbout(overrides: Record<string, unknown> = {}) {
  return {
    obtener: vi.fn(),
    guardar: vi.fn(),
    ...overrides,
  };
}

describe('GET /api/v1/about', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('devuelve 200 con el seed cuando el repositorio no tiene documento', async () => {
    const { app, about } = setup({
      about: makeAbout({ obtener: vi.fn().mockResolvedValue(null) }),
    });

    const response = await request(app).get(API_PATHS.about).set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: seed,
      message: 'Documento Nosotros',
    });
    expect(about.obtener).toHaveBeenCalledTimes(1);
  });

  it('devuelve 200 con el documento existente cuando el repositorio lo tiene', async () => {
    const existente: AboutDto = { ...seed, updatedAt: '2026-02-01T00:00:00Z' };
    const { app, about } = setup({
      about: makeAbout({ obtener: vi.fn().mockResolvedValue(existente) }),
    });

    const response = await request(app).get(API_PATHS.about).set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(existente);
    expect(response.body.message).toBe('Documento Nosotros');
    expect(about.obtener).toHaveBeenCalledTimes(1);
  });
});
