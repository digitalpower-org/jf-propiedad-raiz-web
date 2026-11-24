import { describe, expect, it } from 'vitest';
import {
  filtrarEnNavegador,
  hayFiltrosFrontend,
  leerFiltrosFrontend,
  type TarjetaFiltrable,
} from './catalog-filters';

const t = (id: string, datos: TarjetaFiltrable = {}) => ({ id, ...datos });

const CATALOGO = [
  t('a', { dormitorios: 1, banos: 1, areaConstruida: 45, estrato: 2 }),
  t('b', { dormitorios: 2, banos: 1, areaConstruida: 70, estrato: 3 }),
  t('c', { dormitorios: 3, banos: 2, areaConstruida: 110, estrato: 3 }),
  t('d', { dormitorios: 4, banos: 3, areaConstruida: 180, estrato: 5 }),
  t('sin-datos'),
];

const ids = (filtradas: readonly { id: string }[]) => filtradas.map((tarjeta) => tarjeta.id);

describe('leerFiltrosFrontend', () => {
  it('interpreta los cuatro filtros como números', () => {
    expect(
      leerFiltrosFrontend({ dormitorios: '2', banos: '1', areaMin: '80.5', estrato: '3' }),
    ).toEqual({ dormitorios: 2, banos: 1, areaMin: 80.5, estrato: 3 });
  });

  it('sin valores, todos quedan inactivos', () => {
    expect(hayFiltrosFrontend(leerFiltrosFrontend({}))).toBe(false);
  });

  it.each(['abc', '0', '-2', 'NaN', ''])('un valor inválido («%s») se ignora', (valor) => {
    expect(
      hayFiltrosFrontend(
        leerFiltrosFrontend({ dormitorios: valor, banos: valor, areaMin: valor, estrato: valor }),
      ),
    ).toBe(false);
  });

  it.each(['7', '2.5'])('un estrato fuera de 1-6 o no entero («%s») se ignora', (valor) => {
    expect(leerFiltrosFrontend({ estrato: valor }).estrato).toBeUndefined();
  });

  it('hayFiltrosFrontend detecta uno solo activo', () => {
    expect(hayFiltrosFrontend({ estrato: 3 })).toBe(true);
  });
});

describe('filtrarEnNavegador', () => {
  it('sin filtros activos devuelve todas, incluidas las que no tienen datos', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, {}))).toEqual(['a', 'b', 'c', 'd', 'sin-datos']);
  });

  it('dormitorios es un mínimo', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, { dormitorios: 3 }))).toEqual(['c', 'd']);
  });

  it('baños es un mínimo', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, { banos: 2 }))).toEqual(['c', 'd']);
  });

  it('el área es un mínimo e incluye el valor exacto', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, { areaMin: 110 }))).toEqual(['c', 'd']);
  });

  it('el estrato es exacto, no un mínimo', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, { estrato: 3 }))).toEqual(['b', 'c']);
  });

  it('una tarjeta sin el dato no cumple un filtro activo', () => {
    for (const filtro of [{ dormitorios: 1 }, { banos: 1 }, { areaMin: 1 }, { estrato: 2 }]) {
      expect(ids(filtrarEnNavegador(CATALOGO, filtro))).not.toContain('sin-datos');
    }
  });

  it('los filtros se combinan con «y»', () => {
    expect(ids(filtrarEnNavegador(CATALOGO, { estrato: 3, areaMin: 100 }))).toEqual(['c']);
    expect(ids(filtrarEnNavegador(CATALOGO, { dormitorios: 2, banos: 2 }))).toEqual(['c', 'd']);
  });

  it('sin coincidencias devuelve una lista vacía', () => {
    expect(filtrarEnNavegador(CATALOGO, { dormitorios: 5 })).toEqual([]);
  });

  it('conserva el orden y no modifica la lista original', () => {
    const copia = [...CATALOGO];
    filtrarEnNavegador(CATALOGO, { dormitorios: 2 });
    expect(CATALOGO).toEqual(copia);
  });
});
