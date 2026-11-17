import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PropertyCard } from '@jf/shared-types';
import es from '../../../messages/es.json';
import en from '../../../messages/en.json';
import { setLocale } from '../../test/setup';
import { PropertyCardComponent } from './PropertyCard';

const NOW = new Date('2026-11-16T12:00:00.000Z');
const DAY = 86_400_000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

const makeProperty = (createdAt: string): PropertyCard => ({
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
  createdAt,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  setLocale('es');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('AC1.11.1 | la tarjeta muestra «Nuevo» si es reciente', () => {
  it('con un inmueble de 9 días muestra la insignia en español', () => {
    render(<PropertyCardComponent property={makeProperty(daysAgo(9))} locale="es" />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('en inglés muestra «New»', () => {
    setLocale('en');
    render(<PropertyCardComponent property={makeProperty(daysAgo(9))} locale="en" />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});

describe('AC1.11.2 | con 30 días o más no se muestra', () => {
  it('con exactamente 30 días no muestra la insignia', () => {
    render(<PropertyCardComponent property={makeProperty(daysAgo(30))} locale="es" />);
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('con 45 días no muestra la insignia', () => {
    render(<PropertyCardComponent property={makeProperty(daysAgo(45))} locale="es" />);
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });
});

describe('AC1.11.3 | NEW_FLAG_DAYS configura el cálculo en la tarjeta', () => {
  it('con NEW_FLAG_DAYS=7 un inmueble de 9 días ya no es nuevo', () => {
    vi.stubEnv('NEW_FLAG_DAYS', '7');
    render(<PropertyCardComponent property={makeProperty(daysAgo(9))} locale="es" />);
    expect(screen.queryByText('Nuevo')).not.toBeInTheDocument();
  });

  it('con NEW_FLAG_DAYS=60 un inmueble de 45 días sigue siendo nuevo', () => {
    vi.stubEnv('NEW_FLAG_DAYS', '60');
    render(<PropertyCardComponent property={makeProperty(daysAgo(45))} locale="es" />);
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });
});

describe('textos de la insignia', () => {
  it('es.json y en.json traen property.newBadge', () => {
    expect(es.property.newBadge).toBe('Nuevo');
    expect(en.property.newBadge).toBe('New');
  });
});
