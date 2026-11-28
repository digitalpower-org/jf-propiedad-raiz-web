'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { cerrarSesion } from '@/lib/logout';

export function LogoutButton() {
  const en = useParams().locale === 'en';
  const [saliendo, setSaliendo] = useState(false);
  const [fallo, setFallo] = useState(false);

  const salir = async () => {
    setSaliendo(true);
    setFallo(false);
    try {
      await cerrarSesion();
    } catch {
      setSaliendo(false);
      setFallo(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={salir}
        disabled={saliendo}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        {en ? 'Sign out' : 'Cerrar sesión'}
      </button>
      {fallo && (
        <p role="alert">
          {en ? 'Could not sign out. Try again.' : 'No se pudo cerrar la sesión. Intenta de nuevo.'}
        </p>
      )}
    </>
  );
}
