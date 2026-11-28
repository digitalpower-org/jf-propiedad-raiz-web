import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const documento = { titulo: { es: 'T' }, extracto: { es: 'E' }, secciones: [], equipo: [] };

beforeAll(() => {
  process.env.BFF_INTERNAL_KEY = 'k'.repeat(40);
  process.env.SESSION_JWT_SECRET = 's'.repeat(40);
  process.env.SESSION_JWT_SECRET_PREVIOUS = 'p'.repeat(40);
  process.env.FUNCTIONS_BASE_URL = 'http://backend.test';
});

afterEach(() => vi.unstubAllGlobals());

async function pedir(status: number, cuerpo: unknown) {
  const fetchFalso = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status }));
  vi.stubGlobal('fetch', fetchFalso);
  vi.resetModules();
  const { fetchAboutServer } = await import('./about');
  return { resultado: fetchAboutServer(), fetchFalso };
}

describe('fetchAboutServer (US5.6)', () => {
  it('pide el documento al backend con la clave interna y sin caché', async () => {
    const { resultado, fetchFalso } = await pedir(200, { success: true, data: documento });
    await expect(resultado).resolves.toEqual(documento);
    expect(fetchFalso).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/about'),
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ 'X-Internal-Key': 'k'.repeat(40) }),
      }),
    );
  });

  it('sin documento (404) devuelve null', async () => {
    const { resultado } = await pedir(404, { success: false });
    await expect(resultado).resolves.toBeNull();
  });

  it('ante un error del backend falla, no lo confunde con «vacío»', async () => {
    const { resultado } = await pedir(500, { success: false });
    await expect(resultado).rejects.toThrow('500');
  });

  it('ante una respuesta con otra forma falla', async () => {
    const { resultado } = await pedir(200, { success: true, data: { titulo: { es: 'T' } } });
    await expect(resultado).rejects.toThrow();
  });
});
