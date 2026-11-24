import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRetraso } from './useRetraso';

// AC2.2.9: si la respuesta llega en menos de ~200 ms no se muestra el skeleton.

const montar = (activo: boolean) =>
  renderHook(({ a }) => useRetraso(a), { initialProps: { a: activo } });
const avanzar = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('useRetraso | espera ~200 ms antes de decir «sí»', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('inactivo: siempre false', () => {
    const { result } = montar(false);
    avanzar(1000);
    expect(result.current).toBe(false);
  });

  it('activo: false al inicio y a los 199 ms, true a los 200 ms', () => {
    const { result } = montar(true);
    expect(result.current).toBe(false);
    avanzar(199);
    expect(result.current).toBe(false);
    avanzar(1);
    expect(result.current).toBe(true);
  });

  it('si se desactiva antes de tiempo, nunca llega a true', () => {
    const { result, rerender } = montar(true);
    avanzar(150);
    rerender({ a: false });
    avanzar(500);
    expect(result.current).toBe(false);
  });

  it('al desactivarse después de mostrarse vuelve a false de inmediato', () => {
    const { result, rerender } = montar(true);
    avanzar(200);
    expect(result.current).toBe(true);
    rerender({ a: false });
    expect(result.current).toBe(false);
  });

  it('al reactivarse reinicia el reloj', () => {
    const { result, rerender } = montar(true);
    avanzar(150);
    rerender({ a: false });
    rerender({ a: true });
    avanzar(150);
    expect(result.current).toBe(false);
    avanzar(50);
    expect(result.current).toBe(true);
  });

  it('tras mostrarse y desactivarse, al reactivarse vuelve a esperar', () => {
    const { result, rerender } = montar(true);
    avanzar(200);
    rerender({ a: false });
    rerender({ a: true });
    expect(result.current).toBe(false);
    avanzar(199);
    expect(result.current).toBe(false);
    avanzar(1);
    expect(result.current).toBe(true);
  });

  it('nunca devuelve true en un render con activo=false', () => {
    const renders: Array<[boolean, boolean]> = [];
    const { rerender } = renderHook(
      ({ a }) => {
        const valor = useRetraso(a);
        renders.push([a, valor]);
        return valor;
      },
      { initialProps: { a: true } },
    );
    avanzar(200);
    rerender({ a: false });
    expect(renders.filter(([a, valor]) => !a && valor)).toEqual([]);
  });
});
