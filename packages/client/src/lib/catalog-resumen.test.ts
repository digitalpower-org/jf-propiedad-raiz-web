import { describe, expect, it } from 'vitest';
import { mensajeSinResultados, resumirFiltros } from './catalog-resumen';

// AC2.2.10: el estado vacío ofrece WhatsApp con un mensaje que resume los filtros activos.

describe('resumirFiltros', () => {
  it('sin filtros devuelve cadena vacía', () => {
    expect(resumirFiltros({}, {}, 'es')).toBe('');
  });

  it('el tipo va en el idioma de la página', () => {
    expect(resumirFiltros({ tipo: 'CASA' }, {}, 'es')).toBe('Casa');
    expect(resumirFiltros({ tipo: 'CASA' }, {}, 'en')).toBe('House');
  });

  it('ubicación: municipio (departamento)', () => {
    const filtros = { departamento: 'Antioquia', municipio: 'Medellín' };
    expect(resumirFiltros(filtros, {}, 'es')).toBe('Medellín (Antioquia)');
  });

  it('precio: desde, hasta y entre, con separador de miles', () => {
    expect(resumirFiltros({ precioMin: 100000 }, {}, 'es')).toBe('precio desde 100.000 COP');
    expect(resumirFiltros({ precioMax: 900000000 }, {}, 'es')).toBe('precio hasta 900.000.000 COP');
    expect(resumirFiltros({ precioMin: 100, precioMax: 900 }, {}, 'es')).toBe(
      'precio entre 100 y 900 COP',
    );
    expect(resumirFiltros({ precioMin: 1500000 }, {}, 'en')).toBe('price from COP 1,500,000');
  });

  it('filtros de frontend', () => {
    const frontend = { dormitorios: 2, banos: 1, areaMin: 80, estrato: 3 };
    expect(resumirFiltros({}, frontend, 'es')).toBe(
      'mín. 2 dormitorios, mín. 1 baños, área mín. 80 m², estrato 3',
    );
    expect(resumirFiltros({}, frontend, 'en')).toBe(
      'min. 2 bedrooms, min. 1 bathrooms, min. area 80 m², stratum 3',
    );
  });

  it('combina en orden: tipo, ubicación, precio y frontend', () => {
    const filtros = {
      tipo: 'APARTAMENTO',
      departamento: 'Antioquia',
      municipio: 'Envigado',
      precioMax: 500,
    };
    expect(resumirFiltros(filtros, { estrato: 4 }, 'es')).toBe(
      'Apartamento, Envigado (Antioquia), precio hasta 500 COP, estrato 4',
    );
  });
});

describe('mensajeSinResultados', () => {
  it('sin filtros: mensaje genérico en cada idioma', () => {
    expect(mensajeSinResultados('', 'es')).toMatch(/^Hola/);
    expect(mensajeSinResultados('', 'en')).toMatch(/^Hello/);
  });

  it('con filtros: incluye el resumen tal cual', () => {
    expect(mensajeSinResultados('Casa, estrato 3', 'es')).toContain('Casa, estrato 3');
    expect(mensajeSinResultados('House, stratum 3', 'en')).toContain('House, stratum 3');
  });
});
