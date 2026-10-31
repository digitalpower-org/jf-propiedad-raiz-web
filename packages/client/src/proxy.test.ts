/**
 * MT1.1 — Proxy de cierre de superficie (AC0.1.6).
 *
 * El Proxy decide si la petición existe en el catálogo y si el método está
 * permitido, sin autenticar (eso lo hace cada route handler vía bffRoute).
 */
import { type NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { proxy } from './proxy';

vi.mock('server-only', () => ({ default: undefined }));

function request(
  pathname: string,
  init: { method?: string; headers?: Record<string, string> } = {},
): NextRequest {
  const reqInit: RequestInit = {
    method: init.method ?? 'GET',
    headers: init.headers ?? {},
  };
  // @ts-expect-error - NextRequest espera un RequestInit estricto.
  return new NextRequest(`http://localhost:3001${pathname}`, reqInit);
}

describe('proxy — cierre de superficie del BFF', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ruta no declarada → 404 NOT_FOUND', async () => {
    const response = await proxy(request('/api/no-existe'));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('NOT_FOUND');
  });

  it('método no permitido → 405 METHOD_NOT_ALLOWED con Allow', async () => {
    // /api/properties solo tiene GET y POST declarados
    const response = await proxy(request('/api/properties', { method: 'DELETE' }));
    expect(response.status).toBe(405);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data.code).toBe('METHOD_NOT_ALLOWED');
    expect(response.headers.get('allow')).toContain('GET');
    expect(response.headers.get('allow')).toContain('POST');
  });

  it('ruta declarada con método válido → pasa al handler (NextResponse.next)', async () => {
    const response = await proxy(request('/api/properties', { method: 'GET' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('ruta interna /internal/auth/verify no se resuelve (404)', async () => {
    const response = await proxy(request('/internal/auth/verify', { method: 'POST' }));
    expect(response.status).toBe(404);
  });
});
