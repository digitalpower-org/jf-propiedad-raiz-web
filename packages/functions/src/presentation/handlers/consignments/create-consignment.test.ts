import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { setup } from '../../testing/appBuilderTestHarness';

const INTERNAL_KEY = 'k'.repeat(32);

const inputValido = {
  nombre: 'Juan Pérez',
  telefono: '+573001234567',
  email: 'cliente@ejemplo.com',
  tipo: 'CASA',
  departamento: 'Antioquia',
  municipio: 'Medellín',
  consent: true,
};

describe('POST /api/v1/consignments', () => {
  it('rechaza sin clave interna con 401', async () => {
    const { app } = setup();

    const response = await request(app).post('/api/v1/consignments').send(inputValido);

    expect(response.status).toBe(401);
    expect(response.body.data.code).toBe('UNAUTHORIZED');
  });

  it('rechaza con 422 cuando consent falta (CONSENT_REQUIRED)', async () => {
    const { app } = setup();
    const { consent: _consent, ...sinConsent } = inputValido;

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '203.0.113.10')
      .send(sinConsent);

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('CONSENT_REQUIRED');
  });

  it('retorna 200 y enviado=true cuando la solicitud es válida', async () => {
    const emailSender = { send: vi.fn().mockResolvedValue(undefined) };
    const { app } = setup({ emailSender });

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '203.0.113.10')
      .send(inputValido);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.enviado).toBe(true);
    expect(vi.mocked(emailSender.send)).toHaveBeenCalledTimes(2);
  });

  it('retorna enviado=false y no envía correos cuando el honeypot `sitio` tiene valor', async () => {
    const emailSender = { send: vi.fn().mockResolvedValue(undefined) };
    const { app } = setup({ emailSender });

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '203.0.113.10')
      .send({ ...inputValido, sitio: 'bot-value' });

    expect(response.status).toBe(200);
    expect(response.body.data.enviado).toBe(false);
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('rechaza con 422 cuando el cuerpo tiene campos inválidos', async () => {
    const { app } = setup();

    const response = await request(app)
      .post('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY)
      .set('X-Client-IP', '203.0.113.10')
      .send({ ...inputValido, email: 'no-es-un-email' });

    expect(response.status).toBe(422);
    expect(response.body.data.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza con 405 para método GET', async () => {
    const { app } = setup();

    const response = await request(app)
      .get('/api/v1/consignments')
      .set('X-Internal-Key', INTERNAL_KEY);

    expect(response.status).toBe(405);
    expect(response.body.data.code).toBe('METHOD_NOT_ALLOWED');
  });
});
