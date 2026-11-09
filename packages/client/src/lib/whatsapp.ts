// Helper de WhatsApp (T3, D35, US0.1, US2.5, US3.1, AC2.5.4)
//
// Función pura: recibe { number, message, isMobile } y devuelve la URL de WhatsApp.
// La detección de móvil/escritorio ocurre EN EL MANEJADOR DEL CLIC (AC2.5.4),
// no en useEffect ni con window.innerWidth. El href por defecto funciona sin JS.
// Usa navigator.userAgentData?.mobile con respaldo por user-agent.
//
// Formato URL según documentación oficial WhatsApp Business:
// - Móvil/Universal: https://wa.me/<dígitos>?text=<mensaje codificado>
// - Escritorio: https://web.whatsapp.com/send?phone=<dígitos>&text=<mensaje>
// Fuente: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates

/**
 * Normaliza un número de teléfono a solo dígitos.
 * Elimina +, espacios, guiones, paréntesis.
 * Si el número empieza con 57 (código país Colombia) y tiene 12-13 dígitos,
 * se mantiene; si tiene 10 dígitos empezando por 3, se antepone 57.
 * Cualquier otro formato se usa tal cual (ya normalizado internacionalmente).
 *
 * @param number Número de teléfono (con o sin prefijo internacional)
 * @returns Solo dígitos del número normalizado, o string vacío si no hay dígitos
 */
export function normalizePhoneNumber(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (!digits) return '';

  // Colombia: 10 dígitos empezando por 3 -> anteponer 57
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  // Ya tiene código país (57) + 10 dígitos = 12 dígitos
  if (digits.length === 12 && digits.startsWith('57')) {
    return digits;
  }
  // +57 3XX XXX XXXX = 13 dígitos con el + eliminado
  if (digits.length === 13 && digits.startsWith('573')) {
    return digits;
  }
  // Otros formatos internacionales: usar tal cual
  return digits;
}

/**
 * Obtiene el número de WhatsApp desde la variable de entorno pública.
 * En .env.example el valor es claramente falso y no enrutable.
 * Devuelve null si no está definida (el enlace NO se renderiza).
 *
 * @returns Número normalizado (solo dígitos) o null
 */
export function getWhatsAppNumber(): string | null {
  const envNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!envNumber) return null;
  const normalized = normalizePhoneNumber(envNumber);
  if (!normalized) return null;
  return normalized;
}

/**
 * Construye la URL de WhatsApp para un número y mensaje dados.
 *
 * @param number Número ya normalizado (solo dígitos, ej: 573001234567)
 * @param message Texto del mensaje (se codifica para URL)
 * @param isMobile Si true usa wa.me, si false usa web.whatsapp.com
 * @returns URL completa de WhatsApp
 */
export function buildWhatsAppUrl(params: {
  readonly number: string;
  readonly message: string;
  readonly isMobile: boolean;
}): string {
  const { number, message, isMobile } = params;
  const encodedMessage = encodeURIComponent(message);
  if (isMobile) {
    // Móvil: https://wa.me/<digits>?text=<encoded>
    return `https://wa.me/${number}?text=${encodedMessage}`;
  } else {
    // Escritorio: https://web.whatsapp.com/send?phone=<digits>&text=<encoded>
    return `https://web.whatsapp.com/send?phone=${number}&text=${encodedMessage}`;
  }
}

/**
 * Detecta si el dispositivo es móvil usando navigator.userAgentData (moderno)
 * con fallback a user-agent legacy.
 * Debe llamarse EN EL MANEJADOR DEL CLIC (event handler), no en render.
 */
export function detectIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  // navigator.userAgentData (User-Agent Client Hints API)
  if ('userAgentData' in navigator && typeof navigator.userAgentData === 'object' && navigator.userAgentData !== null) {
    const uaData = navigator.userAgentData as { mobile?: boolean };
    if (typeof uaData.mobile === 'boolean') return uaData.mobile;
  }
  // Fallback: user-agent string
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Re-export BRAND_NAME desde brand.ts
export { BRAND_NAME } from './brand';