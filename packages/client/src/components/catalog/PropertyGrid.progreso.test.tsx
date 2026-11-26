import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { FiltrosFrontend } from '@/lib/catalog-filters';
import type { ApiResponse } from '@/lib/http-client';
import type { IHttpClient } from '@/lib/http-client.types';
import { PropertyGrid } from './PropertyGrid';

// AC2.2.4: la barra de progreso se activa al cambiar un filtro de base de datos.
// AC2.2.5: con un filtro de frontend no hay barra.

const barra = vi.hoisted(() => ({ start: vi.fn(), complete: vi.fn(), reset: vi.fn() }));
vi.mock('@mantine/nprogress', () => ({ nprogress: barra }));
vi.mock('next-intl', () => ({ useTranslations: () => (clave: string) => clave }));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: () => undefined, inView: false }),
}));
vi.mock('./PropertyCard', () => ({
  PropertyCardComponent: ({ property }: { property: { id: string } }) => (
    <article data-testid={`card-${property.id}`} />
  ),
}));
vi.mock('@/lib/whatsapp', () => ({ getWhatsAppNumber: () => null, buildWhatsAppUrl: () => '' }));

function montar() {
  let liberar: () => void = () => undefined;
  const espera = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  // Dos páginas de destacadas y una no destacada. Con tipo=CASA las respuestas quedan retenidas.
  const api: IHttpClient = {
    get: async <T,>(url: string) => {
      const consulta = new URL(url, 'http://prueba.local').searchParams;
      if (consulta.get('tipo') === 'CASA') await espera;
      const destacada = consulta.get('destacada') === 'true';
      const segunda = consulta.get('cursor') === 'p2';
      const id = destacada ? (segunda ? 'a2' : 'a1') : 'n1';
      const nextCursor = destacada && !segunda ? 'p2' : null;
      return {
        success: true,
        data: { items: [{ id }], nextCursor },
      } as unknown as ApiResponse<T>;
    },
  };
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const interfaz = (filtros: Partial<PropertyListParams>, enNavegador?: FiltrosFrontend) => (
    <QueryClientProvider client={cliente}>
      <PropertyGrid
        operacion="VENTA"
        locale="es"
        filters={filtros}
        frontendFilters={enNavegador}
        httpClient={api}
      />
    </QueryClientProvider>
  );
  const { rerender, unmount } = render(interfaz({}));
  return {
    liberar: () => liberar(),
    desmontar: unmount,
    filtrar: () => rerender(interfaz({ tipo: 'CASA' })),
    filtrarEnNavegador: () => rerender(interfaz({}, { estrato: 3 })),
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PropertyGrid | barra de progreso', () => {
  it('la primera carga no activa la barra', async () => {
    montar();
    await screen.findByTestId('card-a1');
    expect(barra.start).not.toHaveBeenCalled();
  });

  it('al cambiar un filtro de base de datos la activa y la completa al llegar la respuesta', async () => {
    const { filtrar, liberar } = montar();
    await screen.findByTestId('card-a1');

    filtrar();
    await vi.waitFor(() => expect(barra.start).toHaveBeenCalledTimes(1));
    expect(barra.complete).not.toHaveBeenCalled();

    liberar();
    await vi.waitFor(() => expect(barra.complete).toHaveBeenCalledTimes(1));
    expect(barra.start).toHaveBeenCalledTimes(1);
  });

  it('reinicia la barra antes de arrancarla, por si quedaba un cierre pendiente', async () => {
    const { filtrar } = montar();
    await screen.findByTestId('card-a1');
    filtrar();
    await vi.waitFor(() => expect(barra.start).toHaveBeenCalledTimes(1));

    expect(barra.reset).toHaveBeenCalledTimes(1);
    expect(barra.reset.mock.invocationCallOrder[0]).toBeLessThan(
      barra.start.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('un filtro de frontend no la activa', async () => {
    const { filtrarEnNavegador } = montar();
    await screen.findByTestId('card-a1');

    filtrarEnNavegador();
    expect(barra.start).not.toHaveBeenCalled();
  });

  it('«cargar más» no la activa', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'loadMore' }));
    await screen.findByTestId('card-a2');
    expect(barra.start).not.toHaveBeenCalled();
  });

  it('si la rejilla se desmonta a medias, la barra se completa', async () => {
    const { filtrar, desmontar } = montar();
    await screen.findByTestId('card-a1');
    filtrar();
    await vi.waitFor(() => expect(barra.start).toHaveBeenCalledTimes(1));

    desmontar();
    expect(barra.complete).toHaveBeenCalledTimes(1);
  });
});
