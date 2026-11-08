import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertyStickySidebar } from './PropertyStickySidebar';
import type { PropertyDetail } from '@jf/shared-types';
import { setLocale } from '../../test/setup';

const mockProperty = {
  codigo: 'JF-0001',
  operacion: 'VENTA',
  precio: 850000000,
  administracion: '450000',
  predial: '2500000',
  titulo: { es: 'Casa Moderna en Laureles', en: 'Modern House in Laureles' },
  slug: 'casa-moderna-laureles',
} as const;

describe('PropertyStickySidebar', () => {
  beforeEach(() => {
    setLocale('es');
  });

  it('renderiza precio formateado en COP', () => {
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(screen.getByText(/\$ 850.000.000/)).toBeInTheDocument();
  });

  it('renderiza etiqueta de operación', () => {
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(screen.getByText('Venta')).toBeInTheDocument();
  });

  it('renderiza botón de WhatsApp con enlace correcto', () => {
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    const whatsappBtn = screen.getByRole('link', { name: /contactar agente/i });
    const href = whatsappBtn.getAttribute('href') || '';
    expect(href).toMatch(/(wa\.me|web\.whatsapp\.com)/);
    expect(whatsappBtn).toHaveAttribute('target', '_blank');
    expect(whatsappBtn).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renderiza administración si existe', () => {
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(screen.getByText(/Administración/)).toBeInTheDocument();
    expect(screen.getByText(/\$ 450.000/)).toBeInTheDocument();
  });

  it('renderiza predial si existe', () => {
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(screen.getByText(/Predial/)).toBeInTheDocument();
    expect(screen.getByText(/\$ 2\.500\.000/)).toBeInTheDocument();
  });

  it('usa inglés cuando locale es en', () => {
    setLocale('en');
    render(<PropertyStickySidebar property={mockProperty} locale="en" />);
    expect(screen.getByText('For Sale')).toBeInTheDocument();
    expect(screen.getByText('Contact Agent')).toBeInTheDocument();
  });

  it('renderiza precio con / mes para ALQUILER', () => {
    const rentalProperty = { ...mockProperty, operacion: 'ALQUILER' as const, precio: 4500000 };
    render(<PropertyStickySidebar property={rentalProperty} locale="es" />);
    expect(screen.getByText(/\$ 4.500.000/)).toBeInTheDocument();
    expect(screen.getByText('/ mes')).toBeInTheDocument();
  });

  it('omite administración si no existe', () => {
    const propertyNoAdmin = { ...mockProperty, administracion: undefined };
    render(<PropertyStickySidebar property={propertyNoAdmin} locale="es" />);
    expect(screen.queryByText(/Administración/)).not.toBeInTheDocument();
  });

  it('omite predial si no existe', () => {
    const propertyNoPredial = { ...mockProperty, predial: undefined };
    render(<PropertyStickySidebar property={propertyNoPredial} locale="es" />);
    expect(screen.queryByText(/Predial/)).not.toBeInTheDocument();
  });
});
