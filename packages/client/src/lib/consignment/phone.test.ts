import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('AC3.1.3 | normalizePhone: formato internacional', () => {
  it.each([
    ['3001234567', '+573001234567'],
    ['300 123 4567', '+573001234567'],
    ['(300) 123-4567', '+573001234567'],
    ['300.123.4567', '+573001234567'],
    ['  3001234567  ', '+573001234567'],
    ['573001234567', '+573001234567'],
    ['+57 300 123 4567', '+573001234567'],
    ['+1 415 555 2671', '+14155552671'],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePhone(raw)).toEqual({ ok: true, value: expected });
  });

  it('acepta los límites de longitud internacional: 8 y 15 dígitos tras el «+»', () => {
    expect(normalizePhone('+12345678')).toEqual({ ok: true, value: '+12345678' });
    expect(normalizePhone('+123456789012345')).toEqual({ ok: true, value: '+123456789012345' });
  });

  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
    ['muy corto', '123'],
    ['10 dígitos que no empiezan por 3', '2001234567'],
    ['9 dígitos', '300123456'],
    ['11 dígitos sin prefijo', '30012345678'],
    ['letras', 'abcdefghij'],
    ['con letras mezcladas', '300abc4567'],
    ['«+» con 7 dígitos', '+1234567'],
    ['«+» con 16 dígitos', '+1234567890123456'],
    ['«+» con cero inicial', '+0123456789'],
    ['solo «+»', '+'],
    ['57 sin 3 de celular', '572001234567'],
  ])('rechaza %s', (_nombre, raw) => {
    expect(normalizePhone(raw)).toEqual({ ok: false });
  });
});
