import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { PropertyStickySidebar } from './PropertyStickySidebar';
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

// jsdom no aplica los CSS modules ni calcula alturas: se simulan la posición y el alto de la barra.
function simulateBar(position: string, height: number) {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ position } as CSSStyleDeclaration);
  return vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(height);
}

describe('PropertyStickySidebar — espacio reservado bajo la barra fija', () => {
  beforeEach(() => {
    setLocale('es');
    document.body.style.paddingBottom = '';
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.style.paddingBottom = '';
  });

  it('reserva la altura de la barra cuando es fija', () => {
    simulateBar('fixed', 230);
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(document.body.style.paddingBottom).toBe('230px');
  });

  it('no reserva espacio cuando la barra no es fija', () => {
    simulateBar('sticky', 230);
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('limpia el espacio al desmontar', () => {
    simulateBar('fixed', 230);
    const { unmount } = render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    expect(document.body.style.paddingBottom).toBe('230px');
    unmount();
    expect(document.body.style.paddingBottom).toBe('');
  });

  it('actualiza el espacio al cambiar el tamaño de la ventana', () => {
    const height = simulateBar('fixed', 230);
    render(<PropertyStickySidebar property={mockProperty} locale="es" />);
    height.mockReturnValue(300);
    window.dispatchEvent(new Event('resize'));
    expect(document.body.style.paddingBottom).toBe('300px');
  });
});
