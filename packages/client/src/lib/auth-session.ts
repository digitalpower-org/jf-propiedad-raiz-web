'use client';

import { signInWithPopup, GoogleAuthProvider, signOut, getIdToken } from 'firebase/auth';
import { auth } from './firebase';

export async function startSession() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  // AC1.5.3: blanquear idToken tras canje, no persistir
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error('Session failed');
  return res.json();
}

export function syncSessionOnTokenChange() {
  // AC1.5.5: onIdTokenChanged re-sincroniza cookie BFF
  auth.onIdTokenChanged(async (user) => {
    if (user) await startSession();
  });
}

export async function renewSession() {
  const idToken = await auth.currentUser?.getIdToken(true);
  if (!idToken) throw new Error('No token');
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return res.ok;
}

export async function logoutSession(): Promise<void> {
  await signOut(auth); // AC1.5.7: limpiar sesión Firebase
  await fetch('/api/auth/logout', { method: 'POST' }); // AC1.5.7: borrar cookie __session
}
