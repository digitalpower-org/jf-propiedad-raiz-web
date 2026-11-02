'use client';
import React, { ReactNode, useEffect } from 'react';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { firebaseApp } from '../../lib/firebase-client';
import { renewSession } from '../../lib/auth-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const auth = getAuth(firebaseApp);
      const unsub = onIdTokenChanged(auth, async (user) => {
        if (user) {
          try {
            await renewSession();
          } catch {
            if (typeof window !== 'undefined') {
              const locale = window.location.pathname.split('/')[1] || 'es';
              const loginPath = `/${locale}/admin/login`;
              // El provider también envuelve la página de login: si ya estamos
              // allí, redirigir otra vez re-dispara onIdTokenChanged y crea un bucle.
              if (window.location.pathname !== loginPath) {
                window.location.replace(loginPath);
              }
            }
          }
        }
      });
      return () => unsub();
    } catch {
      // AC5.4.7: no exponer error técnico al usuario en desarrollo
      return () => {};
    }
  }, []);

  return <>{children}</>;
}
