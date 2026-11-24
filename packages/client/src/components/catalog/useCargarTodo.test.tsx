import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCargarTodo } from './useCargarTodo';

type Args = Parameters<typeof useCargarTodo>;
const montar = (...args: Args) =>
  renderHook((p: Args) => useCargarTodo(...p), { initialProps: args });

describe('useCargarTodo | carga solas las páginas restantes (AC2.2.6)', () => {
  it('con filtro activo y páginas pendientes pide la siguiente', () => {
    const pedir = vi.fn();
    montar(true, true, false, pedir);
    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('sin filtro activo no pide nada', () => {
    const pedir = vi.fn();
    montar(false, true, false, pedir);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('sin más páginas no pide nada', () => {
    const pedir = vi.fn();
    montar(true, false, false, pedir);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('mientras ya está cargando no vuelve a pedir', () => {
    const pedir = vi.fn();
    montar(true, true, true, pedir);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('si la página siguiente falló, no reintenta solo', () => {
    const pedir = vi.fn();
    montar(true, true, false, pedir, true);
    expect(pedir).not.toHaveBeenCalled();
  });

  it('al terminar una página y quedar más, pide la siguiente', () => {
    const pedir = vi.fn();
    const { rerender } = montar(true, true, true, pedir);
    expect(pedir).not.toHaveBeenCalled();
    rerender([true, true, false, pedir]);
    expect(pedir).toHaveBeenCalledTimes(1);
  });
});
