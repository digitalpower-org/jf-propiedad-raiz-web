import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LogoutButton } from '@/app/[locale]/admin/(protected)/LogoutButton';

const cerrarSesion = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logout', () => ({ cerrarSesion }));

beforeEach(() => {
  cerrarSesion.mockReset();
  vi.stubGlobal('fetch', () => new Promise(() => undefined));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('LogoutButton (US1.4)', () => {
  it('cierra la sesión una sola vez aunque se pulse dos veces', () => {
    cerrarSesion.mockReturnValue(new Promise(() => undefined));
    render(<LogoutButton />);
    const boton = screen.getByRole('button', { name: 'Cerrar sesión' });
    fireEvent.click(boton);
    fireEvent.click(boton);
    expect(cerrarSesion).toHaveBeenCalledTimes(1);
  });

  it('si falla, avisa y permite reintentar', async () => {
    cerrarSesion.mockRejectedValue(new Error('x'));
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(cerrarSesion).toHaveBeenCalledTimes(2);
  });
});
