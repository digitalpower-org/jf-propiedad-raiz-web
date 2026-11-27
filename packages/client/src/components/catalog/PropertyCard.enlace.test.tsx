import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { PropertyCard } from '@jf/shared-types';
import { setLocale } from '../../test/setup';
import { PropertyCardComponent } from './PropertyCard';

// AC2.3.6: para volver de la ficha con las páginas ya cargadas y el scroll, el enlace de detalles
// tiene que ser una navegación del cliente (Link de Next). Un <a> recarga el documento y el
// QueryClient del navegador, donde viven las páginas cargadas, se pierde.
// `Link` se sustituye por un <a> marcado para distinguirlo de un <a> normal; el enlace de WhatsApp
// es externo y debe seguir siendo un <a> normal.
vi.mock('next/link', () => ({
  default: ({ prefetch, children, ...resto }: ComponentProps<'a'> & { prefetch?: boolean }) => (
    <a {...resto} data-next-link="true" data-prefetch={String(prefetch)}>
      {children}
    </a>
  ),
}));

const propiedad: PropertyCard = {
  id: 'p1',
  codigo: 'JF-0001',
  slug: 'apartamento-en-venta-en-quinta-JF-0001',
  operacion: 'VENTA',
  tipo: 'APARTAMENTO',
  titulo: { es: 'Apartamento en Venta en Quinta', en: 'Apartment for Sale in Quinta' },
  precio: 150000000,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  destacada: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const enlaceDeDetalles = (href: string) =>
  screen.getAllByRole('link').find((a) => a.getAttribute('href') === href);

beforeEach(() => {
  setLocale('es');
});

describe('PropertyCard | enlace a la ficha (AC2.3.6)', () => {
  it('el enlace de detalles navega con Link de Next, sin precarga', () => {
    render(<PropertyCardComponent property={propiedad} locale="es" />);
    const enlace = enlaceDeDetalles(`/es/propiedad/${propiedad.slug}`);

    expect(enlace).toBeDefined();
    expect(enlace).toHaveAttribute('data-next-link', 'true');
    expect(enlace).toHaveAttribute('data-prefetch', 'false');
  });

  it('control: la dirección del enlace no cambia en español ni en inglés', () => {
    const { unmount } = render(<PropertyCardComponent property={propiedad} locale="es" />);
    expect(enlaceDeDetalles(`/es/propiedad/${propiedad.slug}`)).toBeDefined();
    unmount();

    setLocale('en');
    render(<PropertyCardComponent property={propiedad} locale="en" />);
    expect(enlaceDeDetalles(`/en/propiedad/${propiedad.slug}`)).toBeDefined();
  });

  it('control: el enlace de WhatsApp sigue siendo un <a> externo normal', () => {
    render(<PropertyCardComponent property={propiedad} locale="es" />);
    const externo = screen.getAllByRole('link').find((a) => a.getAttribute('target') === '_blank');

    expect(externo).toBeDefined();
    expect(externo).not.toHaveAttribute('data-next-link');
  });
});
