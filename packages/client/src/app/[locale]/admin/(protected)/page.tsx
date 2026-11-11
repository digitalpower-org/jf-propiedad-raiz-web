import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySession } from '@/server/session/jwt';
import { LogoutButton } from './LogoutButton';

import styles from './page.module.css';

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
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Panel de Administración</h1>
          <p className={styles.subtitle}>
            {claims ? 'Sesión activa' : 'No se pudo verificar la cookie de sesión'}
          </p>
        </header>

        {claims ? (
          <div className={styles.sessionCard}>
            <div className={styles.sessionRow}>
              <span className={styles.sessionLabel}>Usuario:</span>
              <span className={styles.sessionValue}>{claims.email}</span>
            </div>
            <div className={styles.sessionRow}>
              <span className={styles.sessionLabel}>Rol:</span>
              <span className={styles.sessionValue}>{claims.role}</span>
            </div>
            <div className={styles.sessionRow}>
              <span className={styles.sessionLabel}>UID:</span>
              <span className={styles.sessionValue}>{claims.sub}</span>
            </div>
          </div>
        ) : (
          <div className={styles.errorBox}>
            <p className={styles.errorText}>No se pudo verificar la cookie de sesión.</p>
          </div>
        )}

        <div className={styles.logoutContainer}>
          <LogoutButton />
        </div>

        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            Ruta protegida. Solo accesible con cookie <code>__session</code> válida.
          </p>
        </div>
      </div>
    </div>
  );
}
