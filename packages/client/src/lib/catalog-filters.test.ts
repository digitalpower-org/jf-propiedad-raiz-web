import { describe, expect, it } from 'vitest';
import { filtrosParaApi, leerFiltrosDeUrl, tieneErrores, validarFiltros } from './catalog-filters';

const url = (consulta: string) => new URLSearchParams(consulta);

describe('leerFiltrosDeUrl', () => {
  it('lee los filtros de base de datos y los de frontend', () => {
    expect(
      leerFiltrosDeUrl(
        url(
          'tipo=CASA&departamento=Antioquia&municipio=Medell%C3%ADn&precioMin=100&precioMax=900&dormitorios=2&banos=1&areaMin=80&estrato=3',
        ),
      ),
    ).toEqual({
      tipo: 'CASA',
      departamento: 'Antioquia',
      municipio: 'Medellín',
      precioMin: 100,
      precioMax: 900,
      dormitorios: '2',
      banos: '1',
      areaMin: '80',
      estrato: '3',
    });
  });

  it('sin parámetros, todo queda sin definir', () => {
    expect(Object.values(leerFiltrosDeUrl(url(''))).every((v) => v === undefined)).toBe(true);
  });

  it('tipo admite un solo valor: de una lista conserva el primero', () => {
    expect(leerFiltrosDeUrl(url('tipo=FINCA,CASA')).tipo).toBe('FINCA');
  });

  it('un tipo desconocido se descarta', () => {
    expect(leerFiltrosDeUrl(url('tipo=CASTILLO')).tipo).toBeUndefined();
  });

  it('un precio que no es número se conserva como NaN para poder avisarlo', () => {
    expect(leerFiltrosDeUrl(url('precioMin=abc')).precioMin).toBeNaN();
  });
});

describe('validarFiltros', () => {
  it('sin filtros no hay errores', () => {
    expect(tieneErrores(validarFiltros({}))).toBe(false);
  });

  it.each([
    [{ departamento: 'Antioquia' }, true],
    [{ municipio: 'Medellín' }, true],
    [{ departamento: 'Antioquia', municipio: 'Medellín' }, false],
  ])('ubicación %j → error: %s', (filtros, esperado) => {
    expect(validarFiltros(filtros).ubicacion).toBe(esperado);
  });

  it.each([
    [{ precioMin: 900, precioMax: 100 }, 'rango'],
    [{ precioMin: 100, precioMax: 900 }, null],
    [{ precioMin: 500, precioMax: 500 }, null],
    [{ precioMin: -5 }, 'formato'],
    [{ precioMax: 1.5 }, 'formato'],
    [{ precioMin: Number.NaN }, 'formato'],
  ])('precio %j → %s', (filtros, esperado) => {
    expect(validarFiltros(filtros).precio).toBe(esperado);
  });
});

describe('filtrosParaApi', () => {
  it('manda tipo, ubicación completa y precios válidos', () => {
    expect(
      filtrosParaApi({
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
        precioMin: 100,
        precioMax: 900,
      }),
    ).toEqual({
      tipo: 'CASA',
      departamento: 'Antioquia',
      municipio: 'Medellín',
      precioMin: 100,
      precioMax: 900,
    });
  });

  it('los filtros de frontend nunca viajan al backend', () => {
    expect(filtrosParaApi({ dormitorios: '2', banos: '1', areaMin: '80', estrato: '3' })).toEqual(
      {},
    );
  });

  it('departamento sin municipio (o al revés) no se envía', () => {
    expect(filtrosParaApi({ departamento: 'Antioquia' })).toEqual({});
    expect(filtrosParaApi({ municipio: 'Medellín' })).toEqual({});
  });

  it('un rango de precio invertido o con formato inválido no se envía', () => {
    expect(filtrosParaApi({ precioMin: 900, precioMax: 100 })).toEqual({});
    expect(filtrosParaApi({ precioMin: -1, precioMax: 100 })).toEqual({});
  });

  it('lo inválido no arrastra a lo válido', () => {
    expect(filtrosParaApi({ tipo: 'CASA', departamento: 'Antioquia' })).toEqual({ tipo: 'CASA' });
  });
});
