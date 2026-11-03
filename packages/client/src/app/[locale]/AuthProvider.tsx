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
            if (typeof window !== 'undefined') {
              const locale = window.location.pathname.split('/')[1] || 'es';
              if (window.location.pathname === `/${locale}/admin/login`) {
                window.location.replace(`/${locale}/admin`);
              }
            }
          } catch {
            if (typeof window !== 'undefined') {
              const locale = window.location.pathname.split('/')[1] || 'es';
              const isAdminRoute = window.location.pathname.startsWith(`/${locale}/admin`);
              if (isAdminRoute && window.location.pathname !== `/${locale}/admin/login`) {
                const target = `/${locale}/admin/login`;
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
