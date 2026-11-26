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

describe('PropertyGrid | orden de las peticiones', () => {
  it('mientras carga la primera página de destacadas no pide las no destacadas', async () => {
    const pedidas: Array<string | null> = [];
    let liberar: () => void = () => undefined;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const apiLenta: IHttpClient = {
      get: async <T,>(url: string) => {
        pedidas.push(new URL(url, 'http://prueba.local').searchParams.get('destacada'));
        await espera;
        return apiFalsa.get<T>(url);
      },
    };
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PropertyGrid operacion="VENTA" locale="es" filters={{}} httpClient={apiLenta} />
      </QueryClientProvider>,
    );

    await vi.waitFor(() => expect(pedidas).toContain('true'));
    expect(pedidas).toEqual(['true']);

    liberar();
    await screen.findByTestId('card-n1');
    expect(pedidas).toEqual(['true', 'false']);
  });
});

describe('PropertyGrid | mientras llega el filtro nuevo (AC2.2.4)', () => {
  // Retiene las respuestas del filtro nuevo hasta llamar a `liberar`.
  function montar() {
    const pedidas: Array<string | null> = [];
    let liberar: () => void = () => undefined;
    const espera = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const api: IHttpClient = {
      get: async <T,>(url: string) => {
        const consulta = new URL(url, 'http://prueba.local').searchParams;
        if (consulta.get('tipo') === 'CASA') {
          pedidas.push(consulta.get('destacada'));
          await espera;
        }
        return apiFalsa.get<T>(url);
      },
    };
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const interfaz = (filtros: Partial<PropertyListParams>) => (
      <QueryClientProvider client={cliente}>
        <PropertyGrid operacion="VENTA" locale="es" filters={filtros} httpClient={api} />
      </QueryClientProvider>
    );
    const { rerender } = render(interfaz({}));
    return {
      pedidas,
      liberar: () => liberar(),
      filtrar: () => rerender(interfaz({ tipo: 'CASA' })),
    };
  }

  const ocupada = () => screen.getByTestId('property-grid').getAttribute('aria-busy');

  it('conserva las tarjetas anteriores y marca la rejilla como ocupada', async () => {
    const { pedidas, liberar, filtrar } = montar();
    await screen.findByTestId('card-n1');

    filtrar();
    await vi.waitFor(() => expect(pedidas).toContain('true'));
    expect(tarjetas()).toEqual(['card-f1', 'card-n1']);
    expect(ocupada()).toBe('true');

    liberar();
    await screen.findByTestId('card-c1');
    expect(screen.queryByTestId('card-f1')).toBeNull();
    expect(ocupada()).toBe('false');
  });

  it('no pide las no destacadas del filtro nuevo antes de que respondan sus destacadas', async () => {
    const { pedidas, liberar, filtrar } = montar();
    await screen.findByTestId('card-n1');

    filtrar();
    await vi.waitFor(() => expect(pedidas).toContain('true'));
    expect(pedidas).toEqual(['true']);
    liberar();
  });
});

describe('PropertyGrid | respuesta provisional (AC2.2.4)', () => {
  // precioMin 1: sin resultados. precioMin 2: una destacada llega ya y las demás quedan retenidas.
  // precioMin 3: todo retenido. Sin precioMin responde `apiFalsa`.
  const nunca = new Promise<never>(() => undefined);
  const responder = <T,>(items: string[]) =>
    ({
      success: true,
      data: { items: items.map((id) => ({ id })), nextCursor: null },
    }) as unknown as ApiResponse<T>;
  const api: IHttpClient = {
    get: async <T,>(url: string) => {
      const consulta = new URL(url, 'http://prueba.local').searchParams;
      const precio = consulta.get('precioMin');
      if (!precio) return apiFalsa.get<T>(url);
      if (precio === '1') return responder<T>([]);
      if (precio === '2' && consulta.get('destacada') === 'true') return responder<T>(['x1']);
      return nunca;
    },
  };

  function montar(filtros: Partial<PropertyListParams>) {
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const interfaz = (f: Partial<PropertyListParams>) => (
      <QueryClientProvider client={cliente}>
        <PropertyGrid operacion="VENTA" locale="es" filters={f} httpClient={api} />
      </QueryClientProvider>
    );
    const { rerender } = render(interfaz(filtros));
    return (f: Partial<PropertyListParams>) => rerender(interfaz(f));
  }

  it('al volver a un filtro con las demás aún sin responder, no mezcla las del anterior', async () => {
    const filtrarPor = montar({});
    await screen.findByTestId('card-n1');
    filtrarPor({ precioMin: 2 });
    await screen.findByTestId('card-x1');
    filtrarPor({});
    await screen.findByTestId('card-n1');

    filtrarPor({ precioMin: 2 });

    expect(tarjetas()).toEqual(['card-x1']);
  });

  it('no ofrece cargar más ni declara el fin de la lista', async () => {
    const filtrarPor = montar({ tipo: 'CASA' });
    await screen.findByRole('button', { name: 'loadMore' });

    filtrarPor({ precioMin: 3 });

    expect(tarjetas()).toEqual(ids('card-c', 1, 12));
    expect(screen.queryByRole('button', { name: 'loadMore' })).toBeNull();
    expect(screen.queryByText('endOfList')).toBeNull();
  });

  it('si el filtro anterior no tenía resultados, no declara vacío el nuevo antes de tiempo', async () => {
    const filtrarPor = montar({ precioMin: 1 });
    await screen.findByTestId('empty-state');

    filtrarPor({ precioMin: 3 });

    expect(screen.queryByTestId('empty-state')).toBeNull();
  });

  it('con las destacadas nuevas recibidas no mezcla las demás del filtro anterior', async () => {
    const filtrarPor = montar({});
    await screen.findByTestId('card-n1');

    filtrarPor({ precioMin: 2 });
    await screen.findByTestId('card-x1');

    expect(tarjetas()).toEqual(['card-x1']);
    expect(screen.queryByText('endOfList')).toBeNull();
  });
});
