import { cookies } from 'next/headers';
import { verifySession } from '@/server/session/jwt';
import { LogoutButton } from './LogoutButton';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('__session')?.value;
  let claims = null;
  if (cookieVal) {
    try {
      claims = verifySession(cookieVal);
    } catch {
      claims = null;
    }
  }
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '720px' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
        Panel de Administración — Dummy
      </h1>
      <p style={{ color: '#555' }}>Estado: {claims ? 'Sesión activa' : 'Sin sesión válida'}</p>
      {claims ? (
        <div
          style={{ margin: '1rem 0', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}
        >
          <p>
            <strong>Usuario:</strong> {claims.email}
          </p>
          <p>
            <strong>Rol:</strong> {claims.role}
          </p>
          <p>
            <strong>UID:</strong> {claims.sub}
          </p>
        </div>
      ) : (
        <p style={{ color: '#991b1b' }}>No se pudo verificar la cookie de sesión.</p>
      )}
      <div style={{ marginTop: '1rem' }}>
        <LogoutButton />
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#888' }}>
        Ruta protegida ({'/' + 'es'}/admin). Solo accesible con cookie <code>__session</code>{' '}
        válida.
      </p>
    </div>
  );
}
