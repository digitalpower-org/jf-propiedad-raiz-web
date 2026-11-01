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
              window.location.replace(`/${window.location.pathname.split('/')[1] || 'es'}/admin/login`);
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
