import Link from 'next/link';

import styles from './page.module.css';

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>
          Página no encontrada / Page not found
        </p>
        <Link href="/" className={styles.homeLink}>
          Volver a la página de inicio / Go to homepage
        </Link>
      </div>
    </div>
  );
}