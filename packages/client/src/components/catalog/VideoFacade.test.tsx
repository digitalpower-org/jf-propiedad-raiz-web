import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoFacade } from './VideoFacade';

const mockVideos = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/abc123',
  'https://www.youtube.com/embed/xyz789',
];

describe('VideoFacade', () => {
  it('renderiza título de sección', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    expect(screen.getByText('Videos')).toBeInTheDocument();
  });

  it('renderiza una card por video', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(3);
  });

  it('renderiza thumbnails con imagen de YouTube', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    const images = screen.getAllByAltText(/Videos \d+/);
    expect(images).toHaveLength(3);
    images.forEach((img) => {
      const src = img.getAttribute('src');
      expect(src).toMatch(/https:\/\/img\.youtube\.com\/vi\/[^/]+\/maxresdefault\.jpg/);
    });
  });

  it('no renderiza nada si array vacío', () => {
    render(<VideoFacade videos={[]} locale="es" />);
    expect(screen.queryByText('Videos')).not.toBeInTheDocument();
  });

  it('abre modal al hacer click en play', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    const playButtons = screen.getAllByRole('button', { name: /Videos \d+/ });
    fireEvent.click(playButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTitle('Videos 1')).toBeInTheDocument();
  });

  it('cierra modal al hacer click en cerrar', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    const playButtons = screen.getAllByRole('button', { name: /Videos \d+/ });
    fireEvent.click(playButtons[0]);
    fireEvent.click(screen.getByLabelText(/cerrar video|close video/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra modal al hacer click en overlay', () => {
    render(<VideoFacade videos={mockVideos} locale="es" />);
    const playButtons = screen.getAllByRole('button', { name: /Videos \d+/ });
    fireEvent.click(playButtons[0]);
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no renderiza nada si array vacío', () => {
    render(<VideoFacade videos={[]} locale="es" />);
    expect(screen.queryByText('Videos')).not.toBeInTheDocument();
  });

  it('usa inglés cuando locale es en', () => {
    render(<VideoFacade videos={mockVideos} locale="en" />);
    expect(screen.getByText('Videos')).toBeInTheDocument();
  });
});
