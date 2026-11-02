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
              const isAdminRoute = window.location.pathname.includes('/admin');
              // Solo redirigir si está en ruta de admin; si no autorizado -> home (/es)
              // si falta sesión -> /es/admin/login (login con guard del layout protegido)
              if (isAdminRoute) {
                const target =
                  window.location.pathname === `/${locale}/admin/login`
                    ? `/${locale}/admin/login`
                    : `/${locale}`;
                if (window.location.pathname !== target) {
                  window.location.replace(target);
                }
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
