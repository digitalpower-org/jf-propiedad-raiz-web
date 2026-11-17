import { describe, expect, it } from 'vitest';
import {
  WHATSAPP_URL_MAX_LENGTH,
  buildConsignmentWhatsappMessage,
  buildConsignmentWhatsappUrl,
} from './whatsapp-message';
import type { ConsignmentPayload } from './validate';

const BASE: ConsignmentPayload = {
  nombre: 'Ana Pérez',
  telefono: '+573001234567',
  email: 'ana@example.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
  sitio: '',
  idioma: 'en',
};

const NUMBER = '573000000000';

describe('AC3.1.5 | mensaje de respaldo por WhatsApp', () => {
  it('resume los datos obligatorios, en español, aunque la página esté en inglés', () => {
    expect(buildConsignmentWhatsappMessage(BASE)).toBe(
      [
        'Hola, quiero consignar mi inmueble.',
        'Nombre: Ana Pérez',
        'Teléfono: +573001234567',
        'Email: ana@example.com',
        'Tipo de inmueble: CASA',
        'Ubicación: Medellín, Antioquia',
      ].join('\n'),
    );
  });

  it('añade los datos opcionales cuando vienen', () => {
    const message = buildConsignmentWhatsappMessage({
      ...BASE,
      valor: 350000000,
      areaConstruida: 120.5,
      areaLote: 300,
      mensaje: 'Casa esquinera',
    });
    expect(message).toContain('Valor: 350000000');
    expect(message).toContain('Área construida: 120.5 m²');
    expect(message).toContain('Área de lote: 300 m²');
    expect(message).toContain('Mensaje: Casa esquinera');
  });

  it('un valor 0 explícito no se omite del mensaje', () => {
    expect(buildConsignmentWhatsappMessage({ ...BASE, valor: 0 })).toContain('Valor: 0');
  });

  it('el límite por defecto del enlace es de 1.500 caracteres', () => {
    expect(WHATSAPP_URL_MAX_LENGTH).toBe(1500);
  });

  it('genera un enlace wa.me al número dado con el mensaje codificado', () => {
    const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload: BASE });
    expect(url.startsWith(`https://wa.me/${NUMBER}?text=`)).toBe(true);
    const text = decodeURIComponent(url.split('?text=')[1] ?? '');
    expect(text).toBe(buildConsignmentWhatsappMessage(BASE));
  });

  it('un mensaje corto no se recorta', () => {
    const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload: BASE });
    expect(decodeURIComponent(url.split('?text=')[1] ?? '')).not.toContain('…');
  });

  it('con un mensaje enorme el enlace no supera 1.500 caracteres y termina en «…»', () => {
    const payload = { ...BASE, mensaje: 'á'.repeat(5000) };
    const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload });
    expect(url.length).toBeLessThanOrEqual(1500);
    const text = decodeURIComponent(url.split('?text=')[1] ?? '');
    expect(text.endsWith('…')).toBe(true);
    expect(text.startsWith('Hola, quiero consignar mi inmueble.')).toBe(true);
  });

  it('el recorte aprovecha el espacio: un carácter más ya no cabría', () => {
    const payload = { ...BASE, mensaje: 'x'.repeat(3000) };
    const maxLength = 400;
    const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload, maxLength });
    expect(url.length).toBeLessThanOrEqual(maxLength);
    expect(url.length).toBe(maxLength); // cada 'x' pesa 1 carácter: no sobra ni uno
  });

  it('un enlace que mide exactamente el límite no se recorta', () => {
    const full = buildConsignmentWhatsappUrl({ number: NUMBER, payload: BASE });
    const same = buildConsignmentWhatsappUrl({
      number: NUMBER,
      payload: BASE,
      maxLength: full.length,
    });
    expect(same).toBe(full);
    const shorter = buildConsignmentWhatsappUrl({
      number: NUMBER,
      payload: BASE,
      maxLength: full.length - 1,
    });
    expect(decodeURIComponent(shorter.split('?text=')[1] ?? '').endsWith('…')).toBe(true);
  });

  it('respeta un límite personalizado', () => {
    const payload = { ...BASE, mensaje: 'y'.repeat(3000) };
    const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload, maxLength: 300 });
    expect(url.length).toBeLessThanOrEqual(300);
  });

  it('no parte pares sustitutos (emoji) al recortar y la URL sigue siendo decodificable', () => {
    const payload = { ...BASE, mensaje: '😀'.repeat(2000) };
    for (const maxLength of [350, 351, 352, 353, 354, 355, 356, 357, 358]) {
      const url = buildConsignmentWhatsappUrl({ number: NUMBER, payload, maxLength });
      expect(url.length).toBeLessThanOrEqual(maxLength);
      expect(() => decodeURIComponent(url.split('?text=')[1] ?? '')).not.toThrow();
    }
  });
});
