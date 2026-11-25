import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HydrationBoundary } from '@tanstack/react-query';
import type { ReactElement } from 'react';

const prefetchCatalogo = vi.fn();
const clientIpFromHeaders = vi.fn();
const cabeceras = new Headers({ 'x-forwarded-for': '203.0.113.9' });

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(cabeceras) }));
vi.mock('@/server/catalog-prefetch', () => ({
  prefetchCatalogo: (...args: unknown[]) => prefetchCatalogo(...args),
  clientIpFromHeaders: (...args: unknown[]) => clientIpFromHeaders(...args),
}));

import { CatalogoServidor } from './CatalogoServidor';
import { CatalogClient } from '@/components/catalog/CatalogClient';
import { QueryClientProviderWrapper } from '@/components/catalog/QueryClientProvider';

const ESTADO = { mutations: [], queries: [] };

function hijo(el: ReactElement): ReactElement {
  return (el.props as { children: ReactElement }).children;
}

describe('CatalogoServidor (AC2.2.12)', () => {
  beforeEach(() => {
    prefetchCatalogo.mockReset().mockResolvedValue(ESTADO);
    clientIpFromHeaders.mockReset().mockReturnValue('203.0.113.9');
  });

  it('envuelve CatalogClient en proveedor + HydrationBoundary con el estado del prefetch', async () => {
    const el = await CatalogoServidor({
      operacion: 'VENTA',
      locale: 'es',
      searchParams: Promise.resolve({}),
    });
    expect(el.type).toBe(QueryClientProviderWrapper);
    const frontera = hijo(el);
    expect(frontera.type).toBe(HydrationBoundary);
    expect((frontera.props as { state: unknown }).state).toBe(ESTADO);
    const cliente = hijo(frontera);
    expect(cliente.type).toBe(CatalogClient);
    expect(cliente.props).toMatchObject({ operacion: 'VENTA', locale: 'es' });
  });

  it('traduce la URL a filtros de BD y los pasa al prefetch junto con operación e IP', async () => {
    await CatalogoServidor({
      operacion: 'ALQUILER',
      locale: 'en',
      searchParams: Promise.resolve({ tipo: 'CASA', dormitorios: '3' }),
    });
    expect(prefetchCatalogo).toHaveBeenCalledTimes(1);
    const arg = prefetchCatalogo.mock.calls[0]?.[0] as {
      operacion: string;
      filtros: Record<string, unknown>;
      clientIp: string;
    };
    expect(arg.operacion).toBe('ALQUILER');
    expect(arg.clientIp).toBe('203.0.113.9');
    expect(arg.filtros).toEqual(expect.objectContaining({ tipo: 'CASA' }));
    // dormitorios se filtra en el navegador: nunca llega al prefetch (D9)
    expect(arg.filtros).not.toHaveProperty('dormitorios');
    expect(clientIpFromHeaders).toHaveBeenCalledWith(cabeceras);
  });
});
