// AC3.1.3: normaliza el teléfono a formato internacional (+E.164).
// Reglas: 10 dígitos que empiezan por 3 → +57; 57 + celular de 10 dígitos → +57…;
// con «+», de 8 a 15 dígitos y sin cero inicial. Cualquier otra cosa es inválida.

export type PhoneResult = { readonly ok: true; readonly value: string } | { readonly ok: false };

const INVALID: PhoneResult = { ok: false };

export function normalizePhone(raw: string): PhoneResult {
  const compact = raw.replace(/[\s\-.()]/g, '');

  if (compact.startsWith('+')) {
    const digits = compact.slice(1);
    return /^[1-9]\d{7,14}$/.test(digits) ? { ok: true, value: `+${digits}` } : INVALID;
  }
  if (/^3\d{9}$/.test(compact)) return { ok: true, value: `+57${compact}` };
  if (/^573\d{9}$/.test(compact)) return { ok: true, value: `+${compact}` };
  return INVALID;
}
