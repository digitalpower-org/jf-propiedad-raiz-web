import { getFirebaseAuth, signOut } from './firebase-client';

/**
 * Cierre de sesión (US1.4): Firebase primero, para que `onIdTokenChanged` no vuelva a crear la
 * cookie; después el BFF la borra y se va a la portada. Si algo falla no se navega, pero la
 * llamada al BFF se hace siempre (AC1.4.5: no dejar la cookie viva).
 */
export async function cerrarSesion(): Promise<void> {
  let falloFirebase: unknown;
  try {
    await signOut(getFirebaseAuth());
  } catch (error) {
    falloFirebase = error;
  }
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) throw new Error(`El cierre de sesión respondió ${res.status}.`);
  if (falloFirebase) throw falloFirebase;
  window.location.assign('/');
}
