'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'es';
  const isLoginRoute = pathname.includes('/login');
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    // No proteger la ruta de login (evita bucle infinito de redirect)
    if (isLoginRoute) return;

    // AC1.5.1: verificar sesion BFF; si no hay cookie __session valida -> redirigir
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) router.replace(`/${locale}/admin/login`);
        else setAuthOk(true);
      })
      .catch(() => router.replace(`/${locale}/admin/login`));
  }, [router, locale]);

  if (isLoginRoute) return <>{children}</>;

  if (authOk === null) return null; // skeleton de carga (AC7.1)
  if (authOk === false) return null; // redirigiendo

  return <>{children}</>;
}
