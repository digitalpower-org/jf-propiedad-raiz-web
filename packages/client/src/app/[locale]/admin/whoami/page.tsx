import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/server/session/jwt';
import { LogoutButton } from '../(protected)/LogoutButton';

export default async function WhoamiPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get('__session')?.value;

  if (!cookieVal) {
    redirect(`/${locale}`);
  }
  let claims = null;
  try {
    claims = verifySession(cookieVal);
  } catch {
    claims = null;
  }

  if (!claims) {
    redirect(`/${locale}`);
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '720px' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Quién ingresó — Diagnóstico</h1>
      <p style={{ color: '#555' }}>Estado: Sesión activa</p>
      <div
        style={{ margin: '1rem 0', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}
      >
        <p>
          <strong>Usuario (email):</strong> {claims.email}
        </p>
        <p>
          <strong>Rol:</strong> {claims.role}
        </p>
        <p>
          <strong>UID (sub):</strong> {claims.sub}
        </p>
        <p>
          <strong>Expira (exp):</strong> {new Date((claims.exp ?? 0) * 1000).toISOString()}
        </p>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <LogoutButton />
      </div>
    </div>
  );
}
