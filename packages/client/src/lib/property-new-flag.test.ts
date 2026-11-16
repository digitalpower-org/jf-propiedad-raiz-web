import { afterEach, describe, expect, it, vi } from 'vitest';
import { NEW_PROPERTY_DAYS, isNewProperty, resolveNewFlagDays } from './property';

const NOW = new Date('2026-11-16T12:00:00.000Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AC1.11.1 | insignia «Nuevo» por antigüedad', () => {
  it('es nuevo si createdAt tiene menos de NEW_PROPERTY_DAYS días', () => {
    expect(isNewProperty(ago(1), NOW)).toBe(true);
    expect(isNewProperty(ago(NEW_PROPERTY_DAYS - 0.01), NOW)).toBe(true);
  });

  it('el umbral es el que se recibe, no uno fijo', () => {
    expect(isNewProperty(ago(6.99), NOW, 7)).toBe(true);
    expect(isNewProperty(ago(7), NOW, 7)).toBe(false);
    expect(isNewProperty(ago(40), NOW, 60)).toBe(true);
  });

  it('una fecha inválida no es nueva', () => {
    expect(isNewProperty('no-es-una-fecha', NOW)).toBe(false);
  });
});

describe('AC1.11.2 | con 30 días o más no se muestra', () => {
  it('exactamente 30 días y más antiguos no son nuevos', () => {
    expect(NEW_PROPERTY_DAYS).toBe(30);
    expect(isNewProperty(ago(30), NOW)).toBe(false);
    expect(isNewProperty(ago(45), NOW)).toBe(false);
  });
});

describe('AC1.11.3 | NEW_FLAG_DAYS configura el umbral', () => {
  it('acepta un número positivo (también decimal y con espacios)', () => {
    expect(resolveNewFlagDays('7')).toBe(7);
    expect(resolveNewFlagDays(' 14 ')).toBe(14);
    expect(resolveNewFlagDays('1.5')).toBe(1.5);
  });

  it('si falta, está vacío o es inválido usa el valor por defecto', () => {
    for (const raw of [undefined, '', '   ', 'abc', '0', '-5', 'Infinity', 'NaN', '7dias']) {
      expect(resolveNewFlagDays(raw)).toBe(NEW_PROPERTY_DAYS);
    }
  });

  it('isNewProperty sin umbral explícito lee process.env.NEW_FLAG_DAYS', () => {
    vi.stubEnv('NEW_FLAG_DAYS', '7');
    expect(isNewProperty(ago(10), NOW)).toBe(false);
    vi.stubEnv('NEW_FLAG_DAYS', '');
    expect(isNewProperty(ago(10), NOW)).toBe(true);
  });
});
