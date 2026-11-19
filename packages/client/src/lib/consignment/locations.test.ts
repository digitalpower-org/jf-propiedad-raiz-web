import { describe, expect, it } from 'vitest';
import { DEPARTAMENTOS, municipiosDe } from './locations';

describe('AC3.1.1 | ubicaciones (departamento y municipio)', () => {
  it('ofrece los 6 departamentos del catálogo', () => {
    expect([...DEPARTAMENTOS]).toEqual([
      'Antioquia',
      'Cundinamarca',
      'Valle del Cauca',
      'Atlántico',
      'Santander',
      'Bolívar',
    ]);
  });

  it('Antioquia incluye Medellín y Rionegro', () => {
    expect(municipiosDe('Antioquia')).toEqual(expect.arrayContaining(['Medellín', 'Rionegro']));
    expect(municipiosDe('Antioquia')).toHaveLength(7);
  });

  it('cada departamento tiene al menos un municipio y sin repetidos', () => {
    for (const departamento of DEPARTAMENTOS) {
      const municipios = municipiosDe(departamento);
      expect(municipios.length).toBeGreaterThan(0);
      expect(new Set(municipios).size).toBe(municipios.length);
    }
  });

  it('un departamento desconocido o vacío no tiene municipios', () => {
    expect(municipiosDe('')).toEqual([]);
    expect(municipiosDe('Atlantida')).toEqual([]);
    expect(municipiosDe('toString')).toEqual([]);
  });
});
