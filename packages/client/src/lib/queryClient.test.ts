import { afterEach, describe, expect, it, vi } from 'vitest';

// AC2.2.12: en el servidor un QueryClient compartido entre peticiones mezclaría datos de unas con
// otras; en el navegador debe ser uno solo para que la caché sobreviva a los renders.

async function cargar() {
  vi.resetModules();
  return import('./queryClient');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getQueryClient', () => {
  it('en el servidor devuelve un cliente nuevo en cada llamada', async () => {
    const { getQueryClient } = await cargar();
    expect(getQueryClient()).not.toBe(getQueryClient());
  });

  it('en el navegador devuelve siempre el mismo cliente', async () => {
    vi.stubGlobal('window', {});
    const { getQueryClient } = await cargar();
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it('lo hidratado no se vuelve a pedir antes de 60 s ni al volver a la pestaña', async () => {
    const { getQueryClient } = await cargar();
    const consultas = getQueryClient().getDefaultOptions().queries;
    expect(consultas?.staleTime).toBe(60_000);
    expect(consultas?.refetchOnWindowFocus).toBe(false);
    expect(consultas?.retry).toBe(1);
  });
});
