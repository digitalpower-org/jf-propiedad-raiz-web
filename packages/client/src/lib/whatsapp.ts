// Helper de WhatsApp (T3, D35, US0.1, US2.5, US3.1)
//
// Función pura: recibe { number, message, isMobile } y devuelve la URL de WhatsApp.
// La detección de móvil ocurre en el manejador del clic, en el cliente (AC2.5.4).
// No depende de variables de entorno ni del DOM: testeable de forma aislada.

/**
 * Construye la URL de WhatsApp para un número y mensaje dados.
 *
 * Reglas de formato del número (AC3.1.3):
 * - Si el número tiene 10 dígitos y empieza por 3, se asume Colombia (+57).
 * - Cualquier otro formato se usa tal cual (ya normalizado internacionalmente).
 *
 * @param number Número de teléfono (con o sin prefijo internacional).
 * @param message Texto del mensaje (se codifica para URL).
 * @param isMobile Si la petición viene de un dispositivo móvil (abre la app nativa).
 * @returns URL completa de WhatsApp.
 */
export function buildWhatsAppUrl(params: {
  readonly number: string;
  readonly message: string;
  readonly isMobile: boolean;
}): string {
  const { number, message, isMobile } = params;

  // Normalizar número: si son 10 dígitos empezando por 3, anteponer +57 (Colombia)
  const normalizedNumber = /^3\d{9}$/.test(number.replace(/\s/g, ''))
    ? `57${number.replace(/\s/g, '')}`
    : number.replace(/\s/g, '');

  const encodedMessage = encodeURIComponent(message);
  const scheme = isMobile ? 'https://wa.me' : 'https://web.whatsapp.com/send';

  return `${scheme}?phone=${normalizedNumber}&text=${encodedMessage}`;
}
