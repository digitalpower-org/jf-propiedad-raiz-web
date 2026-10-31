'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'es';
  const isLoginRoute = pathname === `/${locale}/admin/login`;
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  // La ruta de login no requiere sesion: se considera autenticada de inmediato
  // para evitar el bucle de redireccion y la pantalla en blanco.
  const effectiveAuthOk = isLoginRoute ? true : authOk;

  useEffect(() => {
    if (isLoginRoute) return;

    // AC1.5.1: verificar sesion BFF; si no hay cookie __session valida -> redirigir
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) {
          setAuthOk(false);
          router.replace(`/${locale}/admin/login`);
        } else {
          setAuthOk(true);
        }
      })
      .catch(() => {
        setAuthOk(false);
        router.replace(`/${locale}/admin/login`);
      });
  }, [router, locale, isLoginRoute]);

  if (effectiveAuthOk === null) return null; // skeleton de carga (AC7.1)
  if (effectiveAuthOk === false) return null; // redirigiendo

  return <>{children}</>;
}
