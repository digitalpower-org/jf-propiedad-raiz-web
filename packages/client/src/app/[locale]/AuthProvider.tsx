/**
 * AuthProvider — PROVISIONAL / EN DESARROLLO (AC5.4.7 / US5.4 / MT1.3)
 *
 * Estado: Implementado con base en firebase-client + auth-session.
 * No es definitivo: falta integración completa con ErrorBoundary,
 * notificaciones Mantine, y verificación de todos los casos 401/403.
 * Deberá marcarse [x] en TODOS.md solo cuando AC5.4.7, AC5.4.9 y AC5.4.10
 * pasen con evidencia E2E (admin-guard completo).
 */
'use client';
import React, { ReactNode } from 'react';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { firebaseApp } from '../../lib/firebase-client';
import { renewSession } from '../../lib/auth-session';

export function AuthProvider({ children }: { children: ReactNode }) {
  React.useEffect(() => {
    const auth = getAuth(firebaseApp);
    const unsub = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          await renewSession();
        } catch {
          // AC5.4.7: redirección al login si renovación falla
          if (typeof window !== 'undefined') {
            window.location.href = '/admin/login';
          }
        }
      }
    });
    return () => unsub();
  }, []);

  return <>{children}</>;
}
