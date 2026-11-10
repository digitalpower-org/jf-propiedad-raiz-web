'use client';
import { useState } from 'react';

export function LogoutButton() {
  const [done] = useState(false);
  return (
    <button
      onClick={async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/es/admin/login';
      }}
      style={{
        padding: '8px 16px',
        cursor: 'pointer',
        background: '#dc2626',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
      }}
    >
      {done ? 'Cerrado' : 'Cerrar sesión (logout)'}
    </button>
  );
}
