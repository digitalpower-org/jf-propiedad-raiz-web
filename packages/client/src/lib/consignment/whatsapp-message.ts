// AC3.1.5: mensaje de respaldo por WhatsApp (siempre en español) con los datos del formulario.
// El enlace se recorta para que no supere ~1.500 caracteres. Se usa el helper T3.

import { buildWhatsAppUrl } from '@/lib/whatsapp';
import type { ConsignmentPayload } from './validate';

export const WHATSAPP_URL_MAX_LENGTH = 1500;
const ELLIPSIS = '…';

export function buildConsignmentWhatsappMessage(payload: ConsignmentPayload): string {
  const lines = [
    'Hola, quiero consignar mi inmueble.',
    `Nombre: ${payload.nombre}`,
    `Teléfono: ${payload.telefono}`,
    `Email: ${payload.email}`,
    `Tipo de inmueble: ${payload.tipo}`,
    `Ubicación: ${payload.municipio}, ${payload.departamento}`,
  ];
  if (payload.valor !== undefined) lines.push(`Valor: ${payload.valor}`);
  if (payload.areaConstruida !== undefined) {
    lines.push(`Área construida: ${payload.areaConstruida} m²`);
  }
  if (payload.areaLote !== undefined) lines.push(`Área de lote: ${payload.areaLote} m²`);
  if (payload.mensaje !== undefined) lines.push(`Mensaje: ${payload.mensaje}`);
  return lines.join('\n');
}

export function buildConsignmentWhatsappUrl(params: {
  readonly number: string;
  readonly payload: ConsignmentPayload;
  readonly maxLength?: number;
}): string {
  const { number, payload, maxLength = WHATSAPP_URL_MAX_LENGTH } = params;
  const urlFor = (message: string) => buildWhatsAppUrl({ number, message });

  const full = buildConsignmentWhatsappMessage(payload);
  if (urlFor(full).length <= maxLength) return urlFor(full);

  // Búsqueda binaria del prefijo más largo que cabe. Se corta por puntos de código
  // (no por unidades UTF-16) para no dejar medio par sustituto, que haría fallar la codificación.
  const chars = Array.from(full);
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (urlFor(chars.slice(0, mid).join('') + ELLIPSIS).length <= maxLength) low = mid;
    else high = mid - 1;
  }
  return urlFor(chars.slice(0, low).join('') + ELLIPSIS);
}
