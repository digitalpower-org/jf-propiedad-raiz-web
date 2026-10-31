import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('construye URL para número colombiano móvil (10 dígitos empezando en 3)', () => {
    const url = buildWhatsAppUrl({
      number: '3001234567',
      message: 'Hola, me interesa un inmueble',
      isMobile: true,
    });
    expect(url).toBe(
      'https://wa.me?phone=573001234567&text=Hola%2C%20me%20interesa%20un%20inmueble',
    );
  });

  it('construye URL para número colombiano móvil con espacios', () => {
    const url = buildWhatsAppUrl({
      number: '300 123 4567',
      message: 'Consulta',
      isMobile: true,
    });
    expect(url).toBe('https://wa.me?phone=573001234567&text=Consulta');
  });

  it('usa web.whatsapp.com cuando no es móvil', () => {
    const url = buildWhatsAppUrl({
      number: '3001234567',
      message: 'Hola',
      isMobile: false,
    });
    expect(url.startsWith('https://web.whatsapp.com/send?phone=573001234567&text=')).toBe(true);
  });

  it('usa número internacional tal cual cuando no cumple el patrón colombiano', () => {
    const url = buildWhatsAppUrl({
      number: '15551234567',
      message: 'Hello',
      isMobile: true,
    });
    expect(url).toContain('phone=15551234567');
    expect(url).toContain('text=Hello');
  });

  it('codifica caracteres especiales del mensaje', () => {
    const url = buildWhatsAppUrl({
      number: '3001234567',
      message: '¿Precio? $200.000.000',
      isMobile: true,
    });
    expect(url).toContain('text=%C2%BFPrecio%3F%20%24200.000.000');
  });

  it('maneja mensaje vacío', () => {
    const url = buildWhatsAppUrl({
      number: '3001234567',
      message: '',
      isMobile: true,
    });
    expect(url).toBe('https://wa.me?phone=573001234567&text=');
  });
});
