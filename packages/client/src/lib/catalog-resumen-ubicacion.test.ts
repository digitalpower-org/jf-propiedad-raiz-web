import { describe, expect, it } from 'vitest';
import { resumirFiltros } from './catalog-resumen';

// AC2.2.10: la ubicación se resume aunque llegue incompleta (p. ej. desde una URL escrita a mano).

describe('resumirFiltros | ubicación incompleta', () => {
  it('solo departamento: se muestra el departamento', () => {
    expect(resumirFiltros({ departamento: 'Antioquia' }, {}, 'es')).toBe('Antioquia');
  });

  it('solo municipio: se muestra el municipio sin paréntesis', () => {
    expect(resumirFiltros({ municipio: 'Medellín' }, {}, 'es')).toBe('Medellín');
  });
});
