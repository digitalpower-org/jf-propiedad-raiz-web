/**
 * MT1.1 — Lógica pura de health check (BFF + Functions).
 *
 * Extraída aquí para que sea testeable con vitest (entorno node).
 * Los route handlers no son puros (config de vitest lo excluye).
 */

export type ServiceHealth = {
  readonly status: 'ok' | 'error';
  readonly service: string;
  readonly latencyMs?: number;
  readonly error?: string;
};

export type HealthResponse = {
  readonly bff: ServiceHealth;
  readonly functions: ServiceHealth;
  readonly overall: 'ok' | 'degraded';
};

export const BFF_HEALTH: ServiceHealth = { status: 'ok', service: 'bff' };

export const FUNCTIONS_HEALTH_TIMEOUT_MS = 5000;

/**
 * Devuelve la base URL del endpoint de Functions.
 * - Local (emulador): default http://127.0.0.1:5001/jf-propiedad-raiz/us-central1
 * - Producción: FUNCTIONS_BASE_URL (ej. https://us-central1-jf-propiedad-raiz.cloudfunctions.net)
 */
export function getFunctionsBaseUrl(): string {
  return process.env.FUNCTIONS_BASE_URL ?? 'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1';
}

/**
 * Verifica el endpoint /health de Functions.
 * - Resolve "ok" si responde { status: 'ok', service: 'functions' }
 * - Reject con ServiceHealth { status: 'error' } en fallos, timeout o HTTP no-200.
 */
export async function checkFunctionsHealth(): Promise<ServiceHealth> {
  const url = `${getFunctionsBaseUrl()}/health`;
  const start = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FUNCTIONS_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - start;

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.status === 'ok') {
        return { status: 'ok', service: 'functions', latencyMs };
      }
      return {
        status: 'error',
        service: 'functions',
        latencyMs,
        error: `Unexpected response: ${JSON.stringify(data)}`,
      };
    }

    return {
      status: 'error',
      service: 'functions',
      latencyMs,
      error: `HTTP ${response.status}`,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        status: 'error',
        service: 'functions',
        latencyMs: FUNCTIONS_HEALTH_TIMEOUT_MS,
        error: 'Timeout',
      };
    }
    return {
      status: 'error',
      service: 'functions',
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Agrega BFF + Functions health. Usado por el route handler.
 */
export async function getHealth(): Promise<{
  body: HealthResponse;
  status: number;
}> {
  const functionsHealth = await checkFunctionsHealth();
  const overall = functionsHealth.status === 'ok' ? 'ok' : 'degraded';

  const body: HealthResponse = {
    bff: BFF_HEALTH,
    functions: functionsHealth,
    overall,
  };

  return { body, status: overall === 'ok' ? 200 : 503 };
}
