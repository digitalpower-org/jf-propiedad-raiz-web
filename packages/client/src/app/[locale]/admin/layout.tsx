'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    // AC1.5.1: verificar sesion BFF; si no hay cookie __session valida -> redirigir
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (!res.ok) router.replace('/admin/login');
        else setAuthOk(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [router]);

  if (authOk === null) return null; // skeleton de carga (AC7.1)
  if (authOk === false) return null; // redirigiendo

  return <>{children}</>;
}
