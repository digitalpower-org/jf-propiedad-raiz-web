import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ApiResponse } from '@/lib/http-client';
import type { IHttpClient } from '@/lib/http-client.types';
import { makeQueryClient } from '@/lib/queryClient';
import { PropertyGrid } from './PropertyGrid';

// AC2.3.6: al abrir una ficha y volver, el listado recupera las páginas ya cargadas desde la caché
// de TanStack Query, sin volver a pedirlas. En el navegador esto exige que el QueryClient sobreviva
// a la navegación (por eso el enlace de la tarjeta usa Link); aquí se fija la otra mitad del
// contrato: con el mismo cliente, desmontar y volver a montar el grid no pide nada.

vi.mock('next-intl', () => ({ useTranslations: () => (clave: string) => clave }));
vi.mock('react-intersection-observer', () => ({
  useInView: () => ({ ref: () => undefined, inView: false }),
}));
vi.mock('./PropertyCard', () => ({
  PropertyCardComponent: ({ property }: { property: { id: string } }) => (
    <article data-testid={`card-${property.id}`} />
  ),
}));
// El setup global ya mockea este módulo sin `getWhatsAppNumber`; aquí no importa el número.
vi.mock('@/lib/whatsapp', () => ({
  getWhatsAppNumber: () => null,
  buildWhatsAppUrl: () => '',
}));

const ids = (prefijo: string, desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => `${prefijo}${desde + i}`);

// Una destacada (se agota enseguida) y 24 no destacadas en dos páginas de 12.
function pagina(destacada: boolean, cursor: string | null) {
  if (destacada) return { items: ['f1'], next: null };
  return cursor === 'p2'
    ? { items: ids('n', 13, 24), next: null }
    : { items: ids('n', 1, 12), next: 'p2' };
}

const peticiones: string[] = [];
const apiFalsa: IHttpClient = {
  get: async <T,>(url: string) => {
    peticiones.push(url);
    const consulta = new URL(url, 'http://prueba.local').searchParams;
    const { items, next } = pagina(consulta.get('destacada') === 'true', consulta.get('cursor'));
    const cuerpo = {
      success: true,
      data: { items: items.map((id) => ({ id })), nextCursor: next },
    };
    return cuerpo as unknown as ApiResponse<T>;
  },
};

const tarjetas = () => screen.getAllByTestId(/^card-/);

afterEach(() => {
  cleanup();
  peticiones.length = 0;
});

describe('PropertyGrid | caché al volver al listado (AC2.3.6)', () => {
  it('con el mismo cliente se ven todas las páginas ya cargadas, sin pedirlas otra vez', async () => {
    const cliente = makeQueryClient();
    const montar = () =>
      render(
        <QueryClientProvider client={cliente}>
          <PropertyGrid operacion="VENTA" locale="es" filters={{}} httpClient={apiFalsa} />
        </QueryClientProvider>,
      );

    const primera = montar();
    await screen.findByTestId('card-n1');
    fireEvent.click(await screen.findByRole('button', { name: 'loadMore' }));
    await screen.findByTestId('card-n24');
    expect(tarjetas()).toHaveLength(25);

    // El usuario pasa un rato en la ficha: la caché no se descarta mientras tanto.
    primera.unmount();
    await new Promise((resolver) => setTimeout(resolver, 50));
    peticiones.length = 0;

    montar();
    await screen.findByTestId('card-n24');

    expect(tarjetas()).toHaveLength(25);
    expect(peticiones).toEqual([]);
  });
});
