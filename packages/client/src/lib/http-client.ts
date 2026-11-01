import { ApiError } from './api-error';
/**
 * Cliente HTTP centralizado para el cliente (BFF /api/*).
 * No importa firebase/auth directamente — sesion por cookie __session (D32).
 * Maneja errores con ApiError (TASKS.md AC0.1.1-AC0.1.11).
 */

export type ApiResponse<T = unknown> =
  | { success: true; data: T; message?: string }
  | {
      success: false;
      data: { code: string; details?: Record<string, string[]>; requestId?: string };
      message: string;
    };

export async function httpClient<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'same-origin',
    });

    if (!res.ok && res.status === 401) {
      // AC1.5.4 / AC5.4.7: redirigir al login ante 401 sin exponer error técnico
      if (typeof window !== 'undefined') {
        window.location.replace('/admin/login');
      }
      throw new ApiError({ code: 'UNAUTHORIZED', message: 'Sesión expirada', status: 401 });
    }

    const data = await res.json().catch(() => ({}));

    if (!data.success) {
      throw new ApiError({
        code: data.data?.code ?? 'INTERNAL',
        message: data.message ?? 'Error desconocido',
        details: data.data?.details,
        requestId: data.data?.requestId,
        status: res.status,
      });
    }

    return data as ApiResponse<T>;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError({ code: 'INTERNAL', message: 'Error de red o carga', status: 0 });
  }
}
