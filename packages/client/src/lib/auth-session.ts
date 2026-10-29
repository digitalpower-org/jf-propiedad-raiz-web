'use client';

// AC1.5.2: Ciclo de sesión vía BFF (D32) — no importa firebase/auth directo
// Usa fetch a /api/auth/session con Authorization: Bearer <idToken>
// El idToken se obtiene fuera de este módulo (Firebase SDK del cliente)

export async function startSession(idToken: string): Promise<boolean> {
  // AC1.5.3: idToken usado solo en memoria, no persiste
  try {
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (res.ok) {
      // AC1.5.3: blanquear tras canje — no guardar idToken
      return true;
    }
  } catch {
    // Fallo de red; no exponer detalle
  }
  return false;
}

export async function renewSessionSingleFlight(): Promise<boolean> {
  // AC1.5.4: single-flight — solo una petición concurrente
  if (renewalPromise) return renewalPromise;
  renewalPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session', { method: 'POST' });
      return res.ok;
    } finally {
      renewalPromise = null;
    }
  })();
  return renewalPromise;
}

let renewalPromise: Promise<boolean> | null = null;

export async function logoutSession(): Promise<void> {
  // AC1.5.7: logout bidireccional
  await fetch('/api/auth/logout', { method: 'POST' });
  // AC1.5.6: sincronizar con BFF (cookie __session borrada)
}
