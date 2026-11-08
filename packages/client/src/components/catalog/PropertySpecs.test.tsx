import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PropertySpecs } from './PropertySpecs';
import type { PropertyDetail } from '@jf/shared-types';
import { setLocale } from '../../test/setup';

const mockProperty = {
  areaConstruida: 280,
  areaLote: 1200,
  dormitorios: 4,
  banos: 3,
  parqueaderos: 2,
  estrato: 5,
  antiguedad: '10',
  administracion: '450000',
  predial: '2500000',
  acabados: {
    es: 'Pisos en porcelanato, cocina integral',
    en: 'Porcelain floors, integral kitchen',
  },
} as const;

describe('PropertySpecs', () => {
  beforeEach(() => {
    setLocale('es');
  });

  it('renderiza título de sección', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('Características')).toBeInTheDocument();
  });

  it('renderiza área construida con unidad m²', () => {
    const { container } = render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(container.textContent).toContain('280 m²');
  });

  it('renderiza área de lote con unidad m²', () => {
    const { container } = render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(container.textContent).toContain('1.200 m²');
  });

  it('renderiza dormitorios', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renderiza baños', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renderiza parqueaderos', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renderiza estrato', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renderiza antigüedad con unidad años', () => {
    const { container } = render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(container.textContent).toContain('10 años');
  });

  it('renderiza administración formateada en COP', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText(/\$ 450\.000/)).toBeInTheDocument();
  });

  it('renderiza predial formateado en COP', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText(/\$ 2\.500\.000/)).toBeInTheDocument();
  });

  it('renderiza acabados', () => {
    render(<PropertySpecs property={mockProperty} locale="es" />);
    expect(screen.getByText('Pisos en porcelanato, cocina integral')).toBeInTheDocument();
  });

  it('omite campos undefined', () => {
    const partialProperty = { ...mockProperty, areaLote: undefined, parqueaderos: undefined };
    const { container } = render(<PropertySpecs property={partialProperty} locale="es" />);
    expect(container.textContent).not.toContain('1.200 m²');
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });

  it('usa inglés cuando locale es en', () => {
    setLocale('en');
    render(<PropertySpecs property={mockProperty} locale="en" />);
    expect(screen.getByText('Built Area')).toBeInTheDocument();
    expect(screen.getByText('Lot Area')).toBeInTheDocument();
    expect(screen.getByText('Bedrooms')).toBeInTheDocument();
    expect(screen.getByText('Bathrooms')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Stratum')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Admin Fee')).toBeInTheDocument();
    expect(screen.getByText('Property Tax')).toBeInTheDocument();
    expect(screen.getByText('Finishes')).toBeInTheDocument();
  });
});
