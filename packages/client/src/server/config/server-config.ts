import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BFF_INTERNAL_KEY: z.string().min(32, 'BFF_INTERNAL_KEY debe tener al menos 32 caracteres'),
  SESSION_JWT_SECRET: z.string().min(32, 'SESSION_JWT_SECRET debe tener al menos 32 caracteres'),
  SESSION_JWT_SECRET_PREVIOUS: z.string().default(''),
  FUNCTIONS_BASE_URL: z.string().url().optional(),
  SESSION_TTL: z.coerce.number().default(3900),
  SESSION_SKEW: z.coerce.number().default(60),
  NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_REGION: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuración de entorno inválida:');
  for (const issue of parsed.error.issues) {
    const path = issue.path.join('.') || '(root)';
    console.error(`  - ${path}: ${issue.message}`);
  }
  throw new Error('Fallo al validar variables de entorno. Revisa los logs anteriores.');
}

const parsedEnv = parsed.data;

function getFunctionsBaseUrl(): string {
  if (parsedEnv.FUNCTIONS_BASE_URL) {
    return parsedEnv.FUNCTIONS_BASE_URL;
  }

  if (parsedEnv.NODE_ENV !== 'production' && parsedEnv.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST) {
    const host = parsedEnv.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST;
    const projectId = parsedEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'jf-propiedad-raiz';
    const region = parsedEnv.NEXT_PUBLIC_FIREBASE_REGION ?? 'us-central1';
    return `http://${host}/${projectId}/${region}`;
  }

  return 'http://127.0.0.1:5001/jf-propiedad-raiz/us-central1';
}

const functionsBaseUrl = getFunctionsBaseUrl();

export const env = parsedEnv;

export const config = {
  env: parsedEnv,
  isProd: parsedEnv.NODE_ENV === 'production',
  isDev: parsedEnv.NODE_ENV === 'development',
  functionsBaseUrl,
} as const;

export { functionsBaseUrl };
export type ServerConfig = typeof config;
export type Env = typeof env;
