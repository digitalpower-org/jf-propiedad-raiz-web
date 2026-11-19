import { describe, expect, it, vi } from 'vitest';
import { CONSIGNMENTS_ENDPOINT, submitConsignment } from './submit';
import type { ConsignmentPayload } from './validate';

const PAYLOAD: ConsignmentPayload = {
  nombre: 'Ana',
  telefono: '+573001234567',
  email: 'ana@example.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
  sitio: '',
  idioma: 'es',
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const errorBody = (code: string) => ({ success: false, data: { code }, message: 'x' });

const respondWith = (response: Response | Error) =>
  vi.fn<typeof fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });

describe('AC3.1.4 | éxito', () => {
  it('200 devuelve success', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(200, { success: true, data: { enviado: true } })),
    );
    expect(result).toEqual({ status: 'success' });
  });

  it('200 con enviado:false (honeypot) también es success: la UI no lo distingue', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(200, { success: true, data: { enviado: false } })),
    );
    expect(result).toEqual({ status: 'success' });
  });

  it('envía un POST JSON a /api/consignments con el payload', async () => {
    const fetchMock = respondWith(json(200, { success: true, data: { enviado: true } }));
    await submitConsignment(PAYLOAD, fetchMock);
    expect(CONSIGNMENTS_ENDPOINT).toBe('/api/consignments');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/consignments');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init?.body))).toEqual(PAYLOAD);
  });
});

describe('AC3.1.5 | EMAIL_DELIVERY_FAILED activa el respaldo', () => {
  it('502 con EMAIL_DELIVERY_FAILED → email_failed', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(502, errorBody('EMAIL_DELIVERY_FAILED'))),
    );
    expect(result).toEqual({ status: 'email_failed' });
  });

  it('502 con otro código es un error genérico, no el respaldo', async () => {
    const result = await submitConsignment(PAYLOAD, respondWith(json(502, errorBody('OTHER'))));
    expect(result).toEqual({ status: 'error' });
  });

  it('502 sin cuerpo JSON es un error genérico', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(new Response('bad', { status: 502 })),
    );
    expect(result).toEqual({ status: 'error' });
  });

  it('el código EMAIL_DELIVERY_FAILED con otro estado HTTP no activa el respaldo', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(500, errorBody('EMAIL_DELIVERY_FAILED'))),
    );
    expect(result).toEqual({ status: 'error' });
  });
});

describe('AC3.3.2 | 422', () => {
  it('422 CONSENT_REQUIRED → consent_required', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(422, errorBody('CONSENT_REQUIRED'))),
    );
    expect(result).toEqual({ status: 'consent_required' });
  });

  it('422 con otro código → invalid', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(422, errorBody('VALIDATION_ERROR'))),
    );
    expect(result).toEqual({ status: 'invalid' });
  });

  it('422 sin cuerpo JSON → invalid', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(new Response('x', { status: 422 })),
    );
    expect(result).toEqual({ status: 'invalid' });
  });
});

describe('AC3.4.2 | límite de envíos', () => {
  it('429 → rate_limited, aunque el cuerpo no sea JSON', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(new Response('slow', { status: 429 })),
    );
    expect(result).toEqual({ status: 'rate_limited' });
  });

  it('429 con sobre de error también → rate_limited', async () => {
    const result = await submitConsignment(
      PAYLOAD,
      respondWith(json(429, errorBody('RATE_LIMITED'))),
    );
    expect(result).toEqual({ status: 'rate_limited' });
  });
});

describe('errores inesperados', () => {
  it.each([400, 401, 403, 404, 500, 503])('HTTP %i → error', async (status) => {
    const result = await submitConsignment(PAYLOAD, respondWith(json(status, errorBody('X'))));
    expect(result).toEqual({ status: 'error' });
  });

  it('un fallo de red → error', async () => {
    const result = await submitConsignment(PAYLOAD, respondWith(new TypeError('fetch failed')));
    expect(result).toEqual({ status: 'error' });
  });
});
