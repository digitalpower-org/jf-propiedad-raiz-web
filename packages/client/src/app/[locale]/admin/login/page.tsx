'use client';
import { useState } from 'react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  UserCredential,
} from 'firebase/auth';
import { getFirebaseAuth } from '../../../../lib/firebase-client';
import { useRouter, useParams } from 'next/navigation';

import styles from './page.module.css';

function validateEmail(value: string) {
  if (!value) return 'El correo es obligatorio';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Correo inválido';
  return null;
}

function validatePassword(value: string) {
  if (!value) return 'La contraseña es obligatoria';
  if (value.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  return null;
}

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return 'Credenciales inválidas. Verifique su correo y contraseña.';
    case 'auth/user-not-found':
      return 'Usuario no encontrado.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Intente más tarde.';
    case 'auth/network-request-failed':
      return 'Error de conexión. Verifique su internet.';
    default:
      return 'Error al iniciar sesión. Intente nuevamente.';
  }
}

export default function AdminLogin() {
  const router = useRouter();
  const params = useParams();
  const locale = (params.locale as string) || 'es';
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: validateEmail,
      password: validatePassword,
    },
  });

  const handleEmailSignIn = async (values: { email: string; password: string }) => {
    setIsLoading(true);
    try {
      const auth = getFirebaseAuth();
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password,
      );
      if (userCredential.user) {
        router.replace(`/${locale}/admin`);
        router.refresh();
      }
    } catch (error) {
      const firebaseError = error as { code?: string };
      const message = getAuthErrorMessage(firebaseError.code || '');
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const auth = getFirebaseAuth();
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      const firebaseError = error as { code?: string };
      const message = getAuthErrorMessage(firebaseError.code || '');
      notifications.show({
        title: 'Error',
        message,
        color: 'red',
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const t = {
    title: locale === 'es' ? 'Acceso al panel de administración' : 'Admin Panel Access',
    email: locale === 'es' ? 'Correo electrónico' : 'Email',
    password: locale === 'es' ? 'Contraseña' : 'Password',
    emailPlaceholder: 'admin@ejemplo.com',
    passwordPlaceholder: '••••••••',
    signIn: locale === 'es' ? 'Iniciar sesión' : 'Sign In',
    signInWithGoogle: locale === 'es' ? 'Continuar con Google' : 'Continue with Google',
    or: locale === 'es' ? 'o' : 'or',
    forgotPassword: locale === 'es' ? '¿Olvidó su contraseña?' : 'Forgot your password?',
    signingIn: locale === 'es' ? 'Iniciando sesión...' : 'Signing in...',
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.title}>{t.title}</h1>
        </div>

        <form onSubmit={form.onSubmit(handleEmailSignIn)} className={styles.loginForm}>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              {t.email}
            </label>
            <input
              {...form.getInputProps('email')}
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className={styles.input}
              disabled={isLoading}
            />
            {form.errors.email && (
              <p className={styles.errorText}>{form.errors.email}</p>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              {t.password}
            </label>
            <input
              {...form.getInputProps('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t.passwordPlaceholder}
              className={styles.input}
              disabled={isLoading}
            />
            {form.errors.password && (
              <p className={styles.errorText}>{form.errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.signInBtn}
          >
            {isLoading ? t.signingIn : t.signIn}
          </button>

          <div className={styles.divider}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>{t.or}</span>
            <div className={styles.dividerLine} />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={styles.googleBtn}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {t.signInWithGoogle}
          </button>

          <p className={styles.forgotPassword}>
            <a href="#" className={styles.forgotLink}>
              {t.forgotPassword}
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
