import { describe, expect, it, vi } from 'vitest';

// Import the REAL module (unmocked) for unit tests of the helper itself
vi.unmock('@/lib/whatsapp');
import { buildWhatsAppUrl, getWhatsAppNumber, normalizePhoneNumber, BRAND_NAME } from './whatsapp';

describe('normalizePhoneNumber', () => {
  it('AC2.5.3 | normaliza número colombiano 10 dígitos empezando en 3', () => {
    expect(normalizePhoneNumber('3001234567')).toBe('573001234567');
  });

  it('AC2.5.3 | normaliza número con espacios: "300 123 4567"', () => {
    expect(normalizePhoneNumber('300 123 4567')).toBe('573001234567');
  });

  it('AC2.5.3 | normaliza número con guiones: "300-123-4567"', () => {
    expect(normalizePhoneNumber('300-123-4567')).toBe('573001234567');
  });

  it('AC2.5.3 | normaliza número con prefijo +57: "+57 300 123 4567"', () => {
    expect(normalizePhoneNumber('+57 300 123 4567')).toBe('573001234567');
  });

  it('AC2.5.3 | normaliza número ya con código país: "573001234567"', () => {
    expect(normalizePhoneNumber('573001234567')).toBe('573001234567');
  });

  it('AC2.5.3 | número internacional US: "15551234567" se mantiene', () => {
    expect(normalizePhoneNumber('15551234567')).toBe('15551234567');
  });

  it('AC2.5.3 | número vacío devuelve string vacío', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });

  it('AC2.5.3 | solo caracteres no numéricos devuelve string vacío', () => {
    expect(normalizePhoneNumber('abc-def')).toBe('');
  });
});

describe('getWhatsAppNumber', () => {
  it('AC2.5.3 | devuelve null si NEXT_PUBLIC_WHATSAPP_NUMBER no está definida', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '');
    expect(getWhatsAppNumber()).toBeNull();
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve null si NEXT_PUBLIC_WHATSAPP_NUMBER es undefined', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', undefined);
    expect(getWhatsAppNumber()).toBeNull();
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve número normalizado para 10 dígitos colombianos', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '3001234567');
    expect(getWhatsAppNumber()).toBe('573001234567');
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve número normalizado con espacios', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '300 123 4567');
    expect(getWhatsAppNumber()).toBe('573001234567');
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve número normalizado con guiones', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '300-123-4567');
    expect(getWhatsAppNumber()).toBe('573001234567');
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve número normalizado con prefijo +57', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '+57 300 123 4567');
    expect(getWhatsAppNumber()).toBe('573001234567');
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve número ya con código país', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', '573001234567');
    expect(getWhatsAppNumber()).toBe('573001234567');
    vi.unstubAllEnvs();
  });

  it('AC2.5.3 | devuelve null si el resultado normalizado está vacío', () => {
    vi.stubEnv('NEXT_PUBLIC_WHATSAPP_NUMBER', 'abc');
    expect(getWhatsAppNumber()).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('buildWhatsAppUrl', () => {
  it('AC2.5.1 | construye URL wa.me con número y mensaje codificado', () => {
    const url = buildWhatsAppUrl({
      number: '573001234567',
      message: 'Hola, me interesa un inmueble',
    });
    // Formato universal: https://wa.me/<dígitos>?text=<encoded>
    expect(url).toBe('https://wa.me/573001234567?text=Hola%2C%20me%20interesa%20un%20inmueble');
  });

  it('AC2.5.2 | codifica caracteres especiales del mensaje', () => {
    const url = buildWhatsAppUrl({
      number: '573001234567',
      message: '¿Precio? \$200.000.000',
    });
    expect(url).toContain('text=%C2%BFPrecio%3F%20%24200.000.000');
  });

  it('AC2.5.2 | maneja mensaje vacío', () => {
    const url = buildWhatsAppUrl({
      number: '573001234567',
      message: '',
    });
    expect(url).toBe('https://wa.me/573001234567?text=');
  });

  it('AC2.5.1 | número internacional US', () => {
    const url = buildWhatsAppUrl({
      number: '15551234567',
      message: 'Hello',
    });
    expect(url).toBe('https://wa.me/15551234567?text=Hello');
  });

  it('AC2.5.4 | helper es función pura: misma entrada produce misma salida', () => {
    const params = { number: '573001234567', message: 'Test' };
    expect(buildWhatsAppUrl(params)).toBe(buildWhatsAppUrl(params));
  });
});

describe('BRAND_NAME', () => {
  it('T1 | es la constante de marca correcta', () => {
    expect(BRAND_NAME).toBe('JF Propiedad Raíz');
  });
});
