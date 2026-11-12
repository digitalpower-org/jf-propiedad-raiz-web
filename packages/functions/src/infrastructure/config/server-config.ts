import { z } from 'zod';

/**
 * Configuración centralizada de variables de entorno del backend.
 *
 * Sigue el mismo patrón que `packages/client/src/server/config/server-config.ts`:
 * se valida `process.env` una sola vez al cargar el módulo y se falla rápido con
 * un mensaje claro si falta algo. De este modo ningún punto del backend lee
 * `process.env` suelto y toda la configuración vive en este archivo.
 *
 * Capa: infrastructure. Puede ser importada desde `composition.ts`, `index.ts`
 * y adaptadores de infraestructura. La capa de aplicación no la importa (recibe
 * lo que necesita por puertos / inyección).
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BFF_INTERNAL_KEY: z.string().min(32, 'BFF_INTERNAL_KEY debe tener al menos 32 caracteres'),
  BFF_URL: z.url().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  TRANSLATOR_FAKE: z.string().optional(),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY es obligatorio'),
  RESEND_FROM_EMAIL: z.email('RESEND_FROM_EMAIL debe ser un correo válido').optional(),
  JUAN_EMAIL: z.email('JUAN_EMAIL debe ser un correo válido').optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
  R2_ENDPOINT: z.url('R2_ENDPOINT debe ser una URL válida'),
  R2_REGION: z.string().min(1, 'R2_REGION es obligatorio (ej. "auto")'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID es obligatorio'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY es obligatorio'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET es obligatorio'),
  R2_PUBLIC_BASE_URL: z.url('R2_PUBLIC_BASE_URL debe ser una URL válida'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuración de entorno inválida:');
  for (const issue of parsed.error.issues) {
    const path = issue.path.join('.') || '(root)';
    console.error(`  - ${path}: ${issue.message}`);
  }
  throw new Error('Fallo al validar variables de entorno del backend. Revisa los logs anteriores.');
}

export const env = parsed.data;

const DEFAULT_BFF_URL = 'http://127.0.0.1:3000';
const DEFAULT_FIREBASE_PROJECT_ID = 'jf-propiedad-raiz';
const DEFAULT_JUAN_EMAIL = 'juanfer@jfpropiedadraiz.com';
// const DEFAULT_JUAN_EMAIL = 'info@jfpropiedadraiz.com';

export const config = {
  nodeEnv: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  internalKey: env.BFF_INTERNAL_KEY,
  bffUrl: env.BFF_URL ?? DEFAULT_BFF_URL,
  firebaseProjectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_FIREBASE_PROJECT_ID,
  useFakeTranslator: env.TRANSLATOR_FAKE === '1',
  resendApiKey: env.RESEND_API_KEY,
  resendFromEmail: env.RESEND_FROM_EMAIL ?? 'consignaciones@jfpropiedadraiz.com',
  juanEmail: env.JUAN_EMAIL ?? DEFAULT_JUAN_EMAIL,
  firebaseAuthEmulatorHost: env.FIREBASE_AUTH_EMULATOR_HOST,
  r2: {
    endpoint: env.R2_ENDPOINT,
    region: env.R2_REGION,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET,
    publicBaseUrl: env.R2_PUBLIC_BASE_URL,
  } as const,
} as const;

export type Env = typeof env;
export type ServerConfig = typeof config;
