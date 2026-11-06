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
      // The AuthProvider's onIdTokenChanged will handle session renewal
      // and redirect to /admin after successful login
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
      // AuthProvider handles redirect after token change
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">{t.title}</h1>

        <form onSubmit={form.onSubmit(handleEmailSignIn)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t.email}
            </label>
            <input
              {...form.getInputProps('email')}
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                form.errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {form.errors.email && <p className="mt-1 text-sm text-red-600">{form.errors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t.password}
            </label>
            <input
              {...form.getInputProps('password')}
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t.passwordPlaceholder}
              className={`w-full px-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors ${
                form.errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {form.errors.password && (
              <p className="mt-1 text-sm text-red-600">{form.errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t.signingIn : t.signIn}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">{t.or}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
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

        <p className="mt-4 text-center text-sm text-gray-500">
          <a href="#" className="text-green-600 hover:underline">
            {t.forgotPassword}
          </a>
        </p>
      </div>
    </div>
  );
}
