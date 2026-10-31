'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'es';
  const [authOk, setAuthOk] = useState<boolean | null>(null);

  useEffect(() => {
    // Si ya hay sesión válida, redirigir al panel
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if (res.ok) {
          router.replace(`/${locale}/admin`);
        } else {
          setAuthOk(true);
        }
      })
      .catch(() => setAuthOk(true));
  }, [router, locale]);

  if (authOk === null) return null;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Iniciar sesión</h1>
      <p className="mt-2">Inicie sesión para acceder al panel de administración.</p>
      <form className="mt-4 space-y-2" onSubmit={(e) => e.preventDefault()}>
        <input
          type="email"
          placeholder="Correo electrónico"
          className="border border-gray-300 p-2 rounded w-full"
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="border border-gray-300 p-2 rounded w-full"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Iniciar sesión
        </button>
      </form>
    </div>
  );
}
