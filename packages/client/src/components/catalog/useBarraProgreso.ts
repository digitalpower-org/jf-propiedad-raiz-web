import { useEffect } from 'react';
import { nprogress } from '@mantine/nprogress';

/**
 * AC2.2.4: barra de progreso mientras `activa` sea `true`. `reset` va antes de `start` porque
 * `start` no cancela el cierre pendiente de un `complete` anterior.
 */
export function useBarraProgreso(activa: boolean): void {
  useEffect(() => {
    if (!activa) return undefined;
    nprogress.reset();
    nprogress.start();
    return () => nprogress.complete();
  }, [activa]);
}
