import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertyPOIs } from './PropertyPOIs';
import type { PuntoInteres } from '@jf/shared-types';
import { setLocale } from '../../test/setup';

const mockPOIs: PuntoInteres[] = [
  { categoria: 'EDUCACION', etiqueta: { es: 'Colegio San José', en: 'San José School' } },
  {
    categoria: 'TRANSPORTE_PUBLICO',
    etiqueta: { es: 'Metro Industriales', en: 'Industriales Metro' },
  },
  { categoria: 'ZONA_COMERCIAL', etiqueta: undefined },
  { categoria: 'PERSONALIZADO', etiqueta: { es: 'Mi lugar favorito', en: 'My favorite place' } },
];

describe('PropertyPOIs', () => {
  beforeEach(() => {
    setLocale('es');
  });

  it('renderiza título de sección', () => {
    render(<PropertyPOIs puntosInteres={mockPOIs} locale="es" />);
    expect(screen.getByText('Puntos de interés')).toBeInTheDocument();
  });

  it('renderiza cada POI con icono y etiqueta', () => {
    render(<PropertyPOIs puntosInteres={mockPOIs} locale="es" />);
    expect(screen.getByText('Colegio San José')).toBeInTheDocument();
    expect(screen.getByText('Metro Industriales')).toBeInTheDocument();
    expect(screen.getByText('Zona comercial')).toBeInTheDocument();
    expect(screen.getByText('Mi lugar favorito')).toBeInTheDocument();
  });

  it('usa etiqueta personalizada cuando existe', () => {
    render(<PropertyPOIs puntosInteres={mockPOIs} locale="es" />);
    expect(screen.getByText('Mi lugar favorito')).toBeInTheDocument();
  });

  it('usa etiqueta genérica por categoría cuando no hay personalizada', () => {
    render(<PropertyPOIs puntosInteres={mockPOIs} locale="es" />);
    expect(screen.getByText('Zona comercial')).toBeInTheDocument();
  });

  it('usa inglés cuando locale es en', () => {
    setLocale('en');
    render(<PropertyPOIs puntosInteres={mockPOIs} locale="en" />);
    expect(screen.getByText('San José School')).toBeInTheDocument();
    expect(screen.getByText('Industriales Metro')).toBeInTheDocument();
    expect(screen.getByText('Commercial area')).toBeInTheDocument();
    expect(screen.getByText('My favorite place')).toBeInTheDocument();
  });

  it('no renderiza nada si array vacío', () => {
    render(<PropertyPOIs puntosInteres={[]} locale="es" />);
    expect(screen.queryByText('Puntos de interés')).not.toBeInTheDocument();
  });

  it('no renderiza nada si array undefined', () => {
    render(<PropertyPOIs puntosInteres={undefined} locale="es" />);
    expect(screen.queryByText('Puntos de interés')).not.toBeInTheDocument();
  });
});
