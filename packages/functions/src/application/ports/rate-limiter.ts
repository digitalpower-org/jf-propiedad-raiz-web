/**
 * Puerto de límite de velocidad (rate limit) para públicas (US3.4).
 *
 * Controla que una misma clave (por ejemplo, IP del visitante) no exceda un
 * número máximo de operaciones dentro de una ventana de tiempo.
 */

export interface RateLimiter {
  /**
   * Verifica si la clave dada puede realizar una operación dentro del límite.
   *
   * @param key - Identificador de la clave a limitar (por ejemplo, dirección IP).
   * @param limit - Número máximo de operaciones permitidas en la ventana.
   * @param windowSeconds - Duración de la ventana en segundos.
   * @throws {@link RateLimitedError} cuando la clave ha excedido el límite.
   */
  check(key: string, limit: number, windowSeconds: number): Promise<void>;
}

/**
 * Error lanzado por el rate limiter cuando se excede el límite.
 */
export class RateLimitedError extends Error {
  readonly code = 'RATE_LIMITED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'RateLimitedError';
  }
}
