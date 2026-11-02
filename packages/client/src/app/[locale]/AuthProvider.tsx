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
              const pathname = window.location.pathname;
              const isAdminRoute = pathname.includes('/admin');
              // /admin sin locale o /[locale]/admin; login según corresponda
              const loginPath = pathname.startsWith('/admin')
                ? '/admin/login'
                : `/${pathname.split('/')[1] || 'es'}/admin/login`;
              // Solo redirigir si está en ruta de admin (no afectar public/home/login loop)
              // El provider también envuelve la página de login: si ya estamos
              // allí, redirigir otra vez re-dispara onIdTokenChanged y crea un bucle.
              if (isAdminRoute && pathname !== loginPath) {
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
