'use client';
import React, { ReactNode, useEffect } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase-client';
import { renewSession } from '../../lib/auth-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const auth = getFirebaseAuth();
      const unsub = onIdTokenChanged(auth, async (user) => {
        if (user) {
          try {
            await renewSession();
            if (typeof window !== 'undefined') {
              const locale = window.location.pathname.split('/')[1] || 'es';
              if (window.location.pathname === `/${locale}/admin/login`) {
                window.location.replace(`/${locale}/admin`);
              }
            }
          } catch {
            // AC5.4.7: no exponer error técnico al usuario en desarrollo.
            // El guard de rutas protegidas vive EN EL SERVIDOR (admin/(protected)/layout.tsx).
            // Aquí solo renovamos sesión silenciosamente; no hacemos redirecciones.
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
