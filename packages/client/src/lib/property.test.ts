import { describe, expect, it } from 'vitest';

import { isNewProperty, NEW_PROPERTY_DAYS } from './property';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const DAY = 86_400_000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY).toISOString();
}

describe('insignia «Nuevo» derivada de createdAt (US1.11)', () => {
  it('está activa con menos de 30 días', () => {
    expect(isNewProperty(daysAgo(1), NOW)).toBe(true);
    expect(isNewProperty(daysAgo(NEW_PROPERTY_DAYS - 0.01), NOW)).toBe(true);
  });

  it('se apaga a los 30 días exactos o más', () => {
    expect(isNewProperty(daysAgo(NEW_PROPERTY_DAYS), NOW)).toBe(false);
    expect(isNewProperty(daysAgo(NEW_PROPERTY_DAYS + 1), NOW)).toBe(false);
  });

  it('acepta Date además de ISO 8601', () => {
    expect(isNewProperty(new Date(daysAgo(2)), NOW)).toBe(true);
  });

  it('trata una fecha inválida como no nueva', () => {
    expect(isNewProperty('no-es-una-fecha', NOW)).toBe(false);
  });
});
