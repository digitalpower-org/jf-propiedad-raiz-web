import { useEffect, useState } from 'react';

/** AC2.2.9: por debajo de este tiempo de espera el skeleton no se muestra. */
export const RETRASO_SKELETON_MS = 200;

/**
 * Devuelve `true` solo cuando `activo` lleva `ms` milisegundos seguidos en `true`.
 * Al desactivarse vuelve a `false` de inmediato y, al reactivarse, el reloj empieza de cero.
 */
export function useRetraso(activo: boolean, ms: number = RETRASO_SKELETON_MS): boolean {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (!activo) return undefined;
    const temporizador = setTimeout(() => setListo(true), ms);
    return () => {
      clearTimeout(temporizador);
      setListo(false);
    };
  }, [activo, ms]);

  return activo && listo;
}
