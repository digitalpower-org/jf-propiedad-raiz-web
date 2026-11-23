import { describe, expect, it, vi } from 'vitest';

import type { AboutDto } from '../../ports/about-repository';
import { ObtenerAboutUseCase } from './obtener-about';

const seed: AboutDto = {
  titulo: { es: 'Nosotros' },
  extracto: { es: 'Somos una inmobiliaria' },
  secciones: [],
  equipo: [],
  updatedAt: '2026-01-01T00:00:00Z',
};

function makeAboutRepository(resultado: AboutDto | null) {
  return {
    obtener: vi.fn().mockResolvedValue(resultado),
    guardar: vi.fn().mockResolvedValue(seed),
  };
}

function makeLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe('ObtenerAboutUseCase', () => {
  it('devuelve el seed inyectado cuando el repositorio retorna null (documento ausente)', async () => {
    // Given: repositorio sin documento y seed inyectado
    const about = makeAboutRepository(null);
    const logger = makeLogger();
    const useCase = new ObtenerAboutUseCase({ about, seed, logger });

    // When: ejecutar obtener
    const resultado = await useCase.execute();

    // Then: devuelve el seed, nunca null
    expect(about.obtener).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(seed);
    expect(logger.debug).toHaveBeenCalledWith('about_obtenido', {
      encontrado: false,
      fallback: 'seed',
    });
  });

  it('devuelve el documento del repositorio cuando existe', async () => {
    // Given: repositorio con documento existente
    const existente: AboutDto = {
      ...seed,
      updatedAt: '2026-02-01T00:00:00Z',
    };
    const about = makeAboutRepository(existente);
    const logger = makeLogger();
    const useCase = new ObtenerAboutUseCase({ about, seed, logger });

    // When: ejecutar obtener
    const resultado = await useCase.execute();

    // Then: devuelve el documento existente, no el seed
    expect(about.obtener).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(existente);
    expect(resultado).not.toBe(seed);
    expect(logger.debug).toHaveBeenCalledWith('about_obtenido', { encontrado: true });
  });
});
