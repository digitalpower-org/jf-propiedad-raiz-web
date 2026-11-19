// US3.1 / US3.3: validación pura del formulario «Consigne su propiedad».
// Devuelve CLAVES de error (no texto): la UI las traduce (T1) y las pasa a form.setErrors().

import { normalizePhone } from './phone';

export const TIPOS_INMUEBLE = [
  'CASA',
  'APARTAMENTO',
  'LOTE_CAMPESTRE',
  'LOTE_URBANO',
  'FINCA',
  'LOCAL_COMERCIAL',
  'BODEGA',
  'OFICINA',
] as const;

export type TipoInmueble = (typeof TIPOS_INMUEBLE)[number];
export type Idioma = 'es' | 'en';

export type FieldName =
  | 'nombre'
  | 'telefono'
  | 'email'
  | 'tipo'
  | 'departamento'
  | 'municipio'
  | 'valor'
  | 'areaConstruida'
  | 'areaLote'
  | 'consent';

export type FieldErrorKey =
  | 'required'
  | 'invalidEmail'
  | 'invalidPhone'
  | 'invalidNumber'
  | 'invalidOption'
  | 'consentRequired';

export interface ConsignmentFormValues {
  readonly nombre: string;
  readonly telefono: string;
  readonly email: string;
  readonly tipo: string;
  readonly departamento: string;
  readonly municipio: string;
  readonly valor: string | number;
  readonly areaConstruida: string | number;
  readonly areaLote: string | number;
  readonly mensaje: string;
  readonly consent: boolean;
  readonly sitio: string;
}

export interface ConsignmentPayload {
  readonly nombre: string;
  readonly telefono: string;
  readonly email: string;
  readonly tipo: TipoInmueble;
  readonly departamento: string;
  readonly municipio: string;
  readonly valor?: number;
  readonly areaConstruida?: number;
  readonly areaLote?: number;
  readonly mensaje?: string;
  readonly consent: true;
  readonly sitio: string;
  readonly idioma: Idioma;
}

export type ValidationResult =
  | { readonly ok: true; readonly payload: ConsignmentPayload }
  | { readonly ok: false; readonly errors: Partial<Record<FieldName, FieldErrorKey>> };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OptionalNumber = { readonly ok: true; readonly value?: number } | { readonly ok: false };

const INTEGER_PATTERN = /^\d+$/;
// Miles con punto o coma (350.000.000 / 1,500,000): el primer grupo de 1 a 3 dígitos y el resto de 3.
const GROUPED_INTEGER_PATTERN = /^\d{1,3}([.,]\d{3})+$/;
const DECIMAL_PATTERN = /^\d+([.,]\d+)?$/;

// Vacío = no informado (opcional). Con valor: entero positivo (valor, admite separador de miles)
// o decimal positivo (áreas, admite coma decimal).
function parseOptionalNumber(raw: string | number, integerOnly: boolean): OptionalNumber {
  const text = String(raw).trim();
  if (text === '') return { ok: true };

  let normalized: string;
  if (integerOnly) {
    if (INTEGER_PATTERN.test(text)) normalized = text;
    else if (GROUPED_INTEGER_PATTERN.test(text)) normalized = text.replace(/[.,]/g, '');
    else return { ok: false };
  } else {
    if (!DECIMAL_PATTERN.test(text)) return { ok: false };
    normalized = text.replace(',', '.');
  }

  const value = Number(normalized);
  return value > 0 ? { ok: true, value } : { ok: false };
}

function isTipoInmueble(value: string): value is TipoInmueble {
  return (TIPOS_INMUEBLE as readonly string[]).includes(value);
}

export function validateConsignment(
  values: ConsignmentFormValues,
  idioma: Idioma,
): ValidationResult {
  const errors: Partial<Record<FieldName, FieldErrorKey>> = {};

  const nombre = values.nombre.trim();
  if (nombre === '') errors.nombre = 'required';

  const phone = normalizePhone(values.telefono);
  if (values.telefono.trim() === '') errors.telefono = 'required';
  else if (!phone.ok) errors.telefono = 'invalidPhone';

  const email = values.email.trim();
  if (email === '') errors.email = 'required';
  else if (!EMAIL_PATTERN.test(email)) errors.email = 'invalidEmail';

  const tipo = values.tipo.trim();
  if (tipo === '') errors.tipo = 'required';
  else if (!isTipoInmueble(tipo)) errors.tipo = 'invalidOption';

  const departamento = values.departamento.trim();
  if (departamento === '') errors.departamento = 'required';

  const municipio = values.municipio.trim();
  if (municipio === '') errors.municipio = 'required';

  const valor = parseOptionalNumber(values.valor, true);
  if (!valor.ok) errors.valor = 'invalidNumber';

  const areaConstruida = parseOptionalNumber(values.areaConstruida, false);
  if (!areaConstruida.ok) errors.areaConstruida = 'invalidNumber';

  const areaLote = parseOptionalNumber(values.areaLote, false);
  if (!areaLote.ok) errors.areaLote = 'invalidNumber';

  if (values.consent !== true) errors.consent = 'consentRequired';

  // Si hay errores, o algún valor no se pudo interpretar (esto último solo estrecha tipos).
  if (
    Object.keys(errors).length > 0 ||
    !phone.ok ||
    !isTipoInmueble(tipo) ||
    !valor.ok ||
    !areaConstruida.ok ||
    !areaLote.ok
  ) {
    return { ok: false, errors };
  }

  const mensaje = values.mensaje.trim();
  return {
    ok: true,
    payload: {
      nombre,
      telefono: phone.value,
      email,
      tipo,
      departamento,
      municipio,
      ...(valor.value !== undefined && { valor: valor.value }),
      ...(areaConstruida.value !== undefined && { areaConstruida: areaConstruida.value }),
      ...(areaLote.value !== undefined && { areaLote: areaLote.value }),
      ...(mensaje !== '' && { mensaje }),
      consent: true,
      sitio: values.sitio,
      idioma,
    },
  };
}
