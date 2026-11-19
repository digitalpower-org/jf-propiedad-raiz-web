// AC3.1.4–AC3.1.6, AC3.3.2, AC3.4.2: envío a POST /api/consignments y mapeo de respuestas.
// No se persiste nada en el navegador (AC3.1.7).

import type { ConsignmentPayload } from './validate';

export const CONSIGNMENTS_ENDPOINT = '/api/consignments';

export type SubmitResult =
  | { readonly status: 'success' }
  | { readonly status: 'email_failed' }
  | { readonly status: 'consent_required' }
  | { readonly status: 'invalid' }
  | { readonly status: 'rate_limited' }
  | { readonly status: 'error' };

// Sobre de error del backend: { success:false, data:{ code, details, requestId }, message }.
async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null) return undefined;
    const data = (body as { data?: unknown }).data;
    if (typeof data !== 'object' || data === null) return undefined;
    const code = (data as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  } catch {
    return undefined;
  }
}

export async function submitConsignment(
  payload: ConsignmentPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetchImpl(CONSIGNMENTS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    return { status: 'error' };
  }

  // 200 también cubre el honeypot (enviado:false): la UI no debe distinguirlo (AC3.4.1).
  if (response.ok) return { status: 'success' };
  if (response.status === 429) return { status: 'rate_limited' };

  const code = await readErrorCode(response);
  if (response.status === 502 && code === 'EMAIL_DELIVERY_FAILED') {
    return { status: 'email_failed' };
  }
  if (response.status === 422) {
    return code === 'CONSENT_REQUIRED' ? { status: 'consent_required' } : { status: 'invalid' };
  }
  return { status: 'error' };
}
