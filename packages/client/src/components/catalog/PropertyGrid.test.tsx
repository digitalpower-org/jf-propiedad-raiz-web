import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropertyListParams } from '@/lib/api-catalog';
import type { ApiResponse } from '@/lib/http-client';
import type { IHttpClient } from '@/lib/http-client.types';
import { PropertyGrid } from './PropertyGrid';

// AC2.2.12 / AC2.2.4: al cambiar de filtro, las destacadas del filtro nuevo deben poder cargarse
// completas y mostrarse antes que las no destacadas. El grid sigue montado al filtrar
// (CatalogClient no le pone `key`), así que su estado interno sobrevive al cambio.

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

interface Pagina {
  readonly items: readonly string[];
  readonly next: string | null;
}

// Sin filtro: una destacada y una no destacada. Con tipo=CASA: 13 destacadas en dos páginas
// (12 + 1) y una no destacada.
function pagina(destacada: boolean, tipo: string | null, cursor: string | null): Pagina {
  if (!tipo) return destacada ? { items: ['f1'], next: null } : { items: ['n1'], next: null };
  if (!destacada) return { items: ['n2'], next: null };
  return cursor === 'p2' ? { items: ['c13'], next: null } : { items: ids('c', 1, 12), next: 'p2' };
}

const apiFalsa: IHttpClient = {
  get: async <T,>(url: string) => {
    const consulta = new URL(url, 'http://prueba.local').searchParams;
    const { items, next } = pagina(
      consulta.get('destacada') === 'true',
      consulta.get('tipo'),
      consulta.get('cursor'),
    );
    const cuerpo = {
      success: true,
      data: { items: items.map((id) => ({ id })), nextCursor: next },
    };
    return cuerpo as unknown as ApiResponse<T>;
  },
};

function crearGrid(filtros: Partial<PropertyListParams>) {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const interfaz = (f: Partial<PropertyListParams>) => (
    <QueryClientProvider client={cliente}>
      <PropertyGrid operacion="VENTA" locale="es" filters={f} httpClient={apiFalsa} />
    </QueryClientProvider>
  );
  const { rerender } = render(interfaz(filtros));
  return { filtrarPor: (f: Partial<PropertyListParams>) => rerender(interfaz(f)) };
}

const tarjetas = () => screen.getAllByTestId(/^card-/).map((el) => el.dataset.testid);

afterEach(cleanup);

describe('PropertyGrid | destacadas y no destacadas', () => {
  it('base: con un filtro desde el inicio, las destacadas se paginan y van antes que las demás', async () => {
    crearGrid({ tipo: 'CASA' });

    await screen.findByTestId('card-c1');
    fireEvent.click(await screen.findByRole('button', { name: 'loadMore' }));
    await screen.findByTestId('card-n2');

    expect(tarjetas()).toEqual([...ids('card-c', 1, 13), 'card-n2']);
  });

  it('al cambiar de filtro con las destacadas anteriores agotadas, las del filtro nuevo se cargan completas', async () => {
    const { filtrarPor } = crearGrid({});
    await screen.findByTestId('card-n1'); // sin filtro: las destacadas se agotan y se pasa a las demás

    filtrarPor({ tipo: 'CASA' });
    await screen.findByTestId('card-c1');

    // La página 2 de destacadas debe poder pedirse. Si el grid se quedó en «no destacadas»,
    // el botón nunca aparece y c13 no se muestra jamás.
    fireEvent.click(await screen.findByRole('button', { name: 'loadMore' }));
    await screen.findByTestId('card-n2');

    expect(tarjetas()).toEqual([...ids('card-c', 1, 13), 'card-n2']);
  });
});
