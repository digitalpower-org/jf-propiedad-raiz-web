import { describe, expect, it } from 'vitest';
import { TIPOS_INMUEBLE, validateConsignment, type ConsignmentFormValues } from './validate';

const VALID: ConsignmentFormValues = {
  nombre: 'Ana Pérez',
  telefono: '300 123 4567',
  email: 'ana@example.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  valor: '',
  areaConstruida: '',
  areaLote: '',
  mensaje: '',
  consent: true,
  sitio: '',
};

const withValues = (patch: Partial<ConsignmentFormValues>): ConsignmentFormValues => ({
  ...VALID,
  ...patch,
});

describe('AC3.1.1 | campos obligatorios y opcionales', () => {
  it('con solo los obligatorios construye el payload normalizado y sin opcionales', () => {
    expect(validateConsignment(VALID, 'es')).toStrictEqual({
      ok: true,
      payload: {
        nombre: 'Ana Pérez',
        telefono: '+573001234567',
        email: 'ana@example.com',
        tipo: 'CASA',
        departamento: 'Antioquia',
        municipio: 'Medellín',
        consent: true,
        sitio: '',
        idioma: 'es',
      },
    });
  });

  it.each(['nombre', 'telefono', 'email', 'tipo', 'departamento', 'municipio'] as const)(
    'si %s está vacío es obligatorio',
    (campo) => {
      const result = validateConsignment(withValues({ [campo]: '' }), 'es');
      expect(result).toEqual({ ok: false, errors: { [campo]: 'required' } });
    },
  );

  it('un nombre de solo espacios cuenta como vacío', () => {
    const result = validateConsignment(withValues({ nombre: '   ' }), 'es');
    expect(result).toEqual({ ok: false, errors: { nombre: 'required' } });
  });

  it('recorta espacios en los textos del payload', () => {
    const result = validateConsignment(
      withValues({
        nombre: '  Ana  ',
        email: ' ana@example.com ',
        departamento: ' Antioquia ',
        municipio: ' Medellín ',
      }),
      'es',
    );
    expect(result.ok && result.payload).toMatchObject({
      nombre: 'Ana',
      email: 'ana@example.com',
      departamento: 'Antioquia',
      municipio: 'Medellín',
    });
  });

  it('acepta los 8 tipos de inmueble del contrato', () => {
    for (const tipo of TIPOS_INMUEBLE) {
      expect(validateConsignment(withValues({ tipo }), 'es').ok).toBe(true);
    }
    expect(TIPOS_INMUEBLE).toHaveLength(8);
  });

  it('rechaza un tipo que no es del contrato', () => {
    const result = validateConsignment(withValues({ tipo: 'CASTILLO' }), 'es');
    expect(result).toEqual({ ok: false, errors: { tipo: 'invalidOption' } });
  });

  it('incluye el idioma de la página en el payload', () => {
    const result = validateConsignment(VALID, 'en');
    expect(result.ok && result.payload.idioma).toBe('en');
  });
});

describe('AC3.1.1 | campos opcionales', () => {
  it('valor entero, áreas decimales y mensaje se incluyen cuando vienen', () => {
    const result = validateConsignment(
      withValues({ valor: '350000000', areaConstruida: '120,5', areaLote: 300, mensaje: ' Hola ' }),
      'es',
    );
    expect(result.ok && result.payload).toMatchObject({
      valor: 350000000,
      areaConstruida: 120.5,
      areaLote: 300,
      mensaje: 'Hola',
    });
  });

  it('acepta números ya numéricos (como entrega un NumberInput)', () => {
    const result = validateConsignment(
      withValues({ valor: 250000000, areaConstruida: 80.25 }),
      'es',
    );
    expect(result.ok && result.payload).toMatchObject({ valor: 250000000, areaConstruida: 80.25 });
  });

  it('un mensaje de solo espacios no se envía', () => {
    const result = validateConsignment(withValues({ mensaje: '   ' }), 'es');
    expect(result.ok && 'mensaje' in result.payload).toBe(false);
  });

  it.each([
    ['valor con letras', { valor: 'abc' }, 'valor'],
    ['valor decimal', { valor: '1.5' }, 'valor'],
    ['valor cero', { valor: '0' }, 'valor'],
    ['valor negativo', { valor: '-5' }, 'valor'],
    ['área con letras', { areaConstruida: '12m2' }, 'areaConstruida'],
    ['área cero', { areaLote: '0' }, 'areaLote'],
    ['área negativa', { areaLote: '-3' }, 'areaLote'],
    ['área con dos separadores', { areaConstruida: '1,2,3' }, 'areaConstruida'],
  ] as const)('rechaza %s', (_nombre, patch, campo) => {
    const result = validateConsignment(withValues(patch), 'es');
    expect(result).toEqual({ ok: false, errors: { [campo]: 'invalidNumber' } });
  });
});

describe('AC3.1.2 | errores por campo y varios a la vez', () => {
  it('devuelve todos los errores juntos, cada uno asociado a su campo', () => {
    const result = validateConsignment(
      withValues({ nombre: '', telefono: '12', email: 'x', tipo: '', consent: false }),
      'es',
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        nombre: 'required',
        telefono: 'invalidPhone',
        email: 'invalidEmail',
        tipo: 'required',
        consent: 'consentRequired',
      },
    });
  });
});

describe('AC3.1.3 | teléfono', () => {
  it('un teléfono inválido da error en el campo', () => {
    const result = validateConsignment(withValues({ telefono: '2001234567' }), 'es');
    expect(result).toEqual({ ok: false, errors: { telefono: 'invalidPhone' } });
  });

  it('un teléfono vacío es «obligatorio», no «inválido»', () => {
    const result = validateConsignment(withValues({ telefono: '  ' }), 'es');
    expect(result).toEqual({ ok: false, errors: { telefono: 'required' } });
  });
});

describe('email', () => {
  it.each(['a@b', 'a b@c.d', '@c.d', 'a@.d', 'sin-arroba.com'])('rechaza %s', (email) => {
    const result = validateConsignment(withValues({ email }), 'es');
    expect(result).toEqual({ ok: false, errors: { email: 'invalidEmail' } });
  });
});

describe('AC3.3.2 | consentimiento en el frontend', () => {
  it('sin consentimiento impide el envío', () => {
    const result = validateConsignment(withValues({ consent: false }), 'es');
    expect(result).toEqual({ ok: false, errors: { consent: 'consentRequired' } });
  });

  it('con consentimiento el payload lo lleva en true', () => {
    const result = validateConsignment(VALID, 'es');
    expect(result.ok && result.payload.consent).toBe(true);
  });
});

describe('AC3.4.1 | honeypot', () => {
  it('conserva el valor del campo oculto «sitio» tal cual (lo resuelve el backend)', () => {
    const result = validateConsignment(withValues({ sitio: 'http://spam.example' }), 'es');
    expect(result.ok && result.payload.sitio).toBe('http://spam.example');
  });
});
