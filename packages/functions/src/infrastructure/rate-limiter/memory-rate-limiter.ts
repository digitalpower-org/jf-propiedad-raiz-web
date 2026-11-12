import type { RateLimiter } from '../../application/ports/rate-limiter';
import { RateLimitedError } from '../../application/ports/rate-limiter';

interface Registro {
  marcas: number[];
}

/**
 * Rate limiter en memoria (US3.4).
 *
 * Almacena marcas de tiempo por clave y rechaza cuando se excede el límite
 * dentro de la ventana de segundos indicada. Adecuado para desarrollo y un
 * solo nodo; en producción con varios nodos habría que respaldarlo en Redis.
 */
export class MemoryRateLimiter implements RateLimiter {
  private readonly registros = new Map<string, Registro>();

  async check(key: string, limit: number, windowSeconds: number): Promise<void> {
    const ahora = Date.now();
    const ventanaInicio = ahora - windowSeconds * 1000;

    let registro = this.registros.get(key);
    if (!registro) {
      registro = { marcas: [] };
      this.registros.set(key, registro);
    }

    // Eliminar marcas fuera de la ventana.
    registro.marcas = registro.marcas.filter((m) => m > ventanaInicio);

    if (registro.marcas.length >= limit) {
      throw new RateLimitedError(
        `Límite de ${limit} envíos por ${windowSeconds}s excedido para la clave ${key}`,
      );
    }

    registro.marcas.push(ahora);
  }
}
