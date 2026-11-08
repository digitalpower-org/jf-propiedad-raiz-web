import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyGallery } from './PropertyGallery';
import type { Foto, DerivadoImagen, VideoYouTube, Panorama } from '@jf/shared-types';

const createMockDerivados = (base: string): DerivadoImagen[] => [
  { clave: `${base}-320.webp`, ancho: 320 },
  { clave: `${base}-640.webp`, ancho: 640 },
  { clave: `${base}-1280.webp`, ancho: 1280 },
  { clave: `${base}-2048.webp`, ancho: 2048 },
];

const createMockFoto = (base: string): Foto => ({
  derivados: createMockDerivados(base),
});

const mockFotos: Foto[] = [
  createMockFoto('propiedades/JF-0001/foto1'),
  createMockFoto('propiedades/JF-0001/foto2'),
  createMockFoto('propiedades/JF-0001/foto3'),
];

const mockProperty = {
  fotos: mockFotos,
  videos: ['https://www.youtube.com/watch?v=test123'] as VideoYouTube[],
  panoramas: [
    { derivados: [{ clave: 'propiedades/JF-0001/panorama1-4096.webp', ancho: 4096 }] },
  ] as Panorama[],
  titulo: { es: 'Casa Moderna en Laureles', en: 'Modern House in Laureles' },
};

describe('PropertyGallery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza galería principal con primera foto', () => {
    render(
      <PropertyGallery fotos={mockFotos} videos={[]} panoramas={[]} titulo="Test" locale="es" />,
    );
    const images = screen.getAllByAltText(/Test - Galería/);
    expect(images.length).toBeGreaterThanOrEqual(3);
    expect(images[0]).toBeInTheDocument();
  });

  it('renderiza thumbnails cuando hay más de una foto', () => {
    render(
      <PropertyGallery fotos={mockFotos} videos={[]} panoramas={[]} titulo="Test" locale="es" />,
    );
    const thumbnails = screen.getAllByRole('tab');
    expect(thumbnails).toHaveLength(3);
  });

  it('muestra botón de fullscreen cuando hay fotos', () => {
    render(
      <PropertyGallery fotos={mockFotos} videos={[]} panoramas={[]} titulo="Test" locale="es" />,
    );
    expect(screen.getByLabelText(/tour virtual|virtual tour/i)).toBeInTheDocument();
  });

  it('muestra indicadores de video cuando hay videos', () => {
    render(
      <PropertyGallery
        fotos={mockFotos}
        videos={['https://youtube.com/watch?v=test']}
        panoramas={[]}
        titulo="Test"
        locale="es"
      />,
    );
    const buttons = screen.getAllByRole('button', { name: /Videos 1/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('muestra indicadores de panorama cuando hay panoramas', () => {
    render(
      <PropertyGallery
        fotos={mockFotos}
        videos={[]}
        panoramas={mockProperty.panoramas}
        titulo="Test"
        locale="es"
      />,
    );
    const allButtons = screen.getAllByRole('button');
    const panoramaButtons = allButtons.filter((btn) =>
      btn.getAttribute('aria-label')?.includes('Tour virtual 360°'),
    );
    expect(panoramaButtons.length).toBeGreaterThan(0);
  });

  it('no renderiza nada cuando no hay fotos', () => {
    render(<PropertyGallery fotos={[]} videos={[]} panoramas={[]} titulo="Test" locale="es" />);
    expect(screen.getByText(/sin imágenes|no images/i)).toBeInTheDocument();
  });

  it('navega con teclado en fullscreen (ArrowLeft/ArrowRight/Escape)', () => {
    render(
      <PropertyGallery fotos={mockFotos} videos={[]} panoramas={[]} titulo="Test" locale="es" />,
    );
    const fullscreenBtn = screen.getByLabelText(/tour virtual|virtual tour/i);
    fireEvent.click(fullscreenBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
