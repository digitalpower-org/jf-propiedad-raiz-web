import type { ApiResponse } from './http-client';

/**
 * Interfaz de cliente HTTP para inyección de dependencias (DIP).
 * Permite que componentes dependan de una abstracción en lugar de la
 * implementación concreta httpClient, facilitando tests con mocks.
 */
export interface IHttpClient {
  readonly get: <T>(url: string) => Promise<ApiResponse<T>>;
}

/**
 * Adaptador que envuelve la implementación concreta httpClient
 * para cumplir con la interfaz IHttpClient.
 */
export class HttpClientAdapter implements IHttpClient {
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const { httpClient } = await import('./http-client');
    return httpClient<T>(url);
  }
}
