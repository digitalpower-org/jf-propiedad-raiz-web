/**
 * Helpers de identidad contra el emulador de Firebase Auth.
 *
 * `mintIdToken` inicia sesión con email/contraseña y, si la cuenta aún no
 * existe en el emulador, la crea. Devuelve el `idToken` que el BFF canjea en
 * `POST /api/auth/session`.
 */

const AUTH_EMULATOR_BASE = 'http://127.0.0.1:9099';
const API_KEY = 'fake-api-key';
const DEFAULT_PASSWORD = 'password123';

interface IdentityToolkitResponse {
  idToken?: string;
  error?: {
    code?: number;
    message?: string;
  };
}

function authEndpoint(action: string): string {
  return `${AUTH_EMULATOR_BASE}/identitytoolkit.googleapis.com/v1/accounts:${action}?key=${API_KEY}`;
}

async function callAuth(action: string, body: Record<string, unknown>): Promise<Response> {
  return fetch(authEndpoint(action), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function requireIdToken(payload: IdentityToolkitResponse, action: string): string {
  if (payload.idToken) return payload.idToken;
  throw new Error(`Auth emulator ${action} no devolvió idToken: ${JSON.stringify(payload)}`);
}

export async function mintIdToken(
  email: string,
  password: string = DEFAULT_PASSWORD,
): Promise<string> {
  const signInResponse = await callAuth('signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });

  if (signInResponse.ok) {
    return requireIdToken(
      (await signInResponse.json()) as IdentityToolkitResponse,
      'signInWithPassword',
    );
  }

  const signInPayload = (await signInResponse.json()) as IdentityToolkitResponse;
  const signInError = signInPayload.error?.message ?? 'UNKNOWN';

  if (signInError !== 'EMAIL_NOT_FOUND') {
    throw new Error(`No se pudo iniciar sesión como ${email}: ${signInError}`);
  }

  const signUpResponse = await callAuth('signUp', {
    email,
    password,
    returnSecureToken: true,
  });

  if (signUpResponse.ok) {
    return requireIdToken((await signUpResponse.json()) as IdentityToolkitResponse, 'signUp');
  }

  const signUpPayload = (await signUpResponse.json()) as IdentityToolkitResponse;
  throw new Error(
    `No se pudo crear el usuario ${email}: ${signUpPayload.error?.message ?? 'UNKNOWN'}`,
  );
}
