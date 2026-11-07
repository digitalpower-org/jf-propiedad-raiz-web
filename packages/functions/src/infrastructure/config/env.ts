import { z } from 'zod';

export interface AppConfig {
  readonly internalKey: string;
  readonly bffUrl: string;
  readonly firebaseProjectId: string;
  readonly useFakeTranslator: boolean;
}

const EnvSchema = z.object({
  BFF_INTERNAL_KEY: z.string().min(32, 'BFF_INTERNAL_KEY debe tener al menos 32 caracteres'),
  BFF_URL: z.string().url().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  TRANSLATOR_FAKE: z.string().optional(),
});

export const DEFAULT_BFF_URL = 'http://127.0.0.1:3000';
export const DEFAULT_FIREBASE_PROJECT_ID = 'jf-propiedad-raiz';

/**
 * Valida `process.env` al arrancar. Application/Domain nunca leen variables de
 * entorno: reciben este objeto ya validado.
 */
export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);

  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Configuración de entorno inválida: ${fields}`);
  }

  return {
    internalKey: parsed.data.BFF_INTERNAL_KEY,
    bffUrl: parsed.data.BFF_URL ?? DEFAULT_BFF_URL,
    firebaseProjectId: parsed.data.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_FIREBASE_PROJECT_ID,
    useFakeTranslator: parsed.data.TRANSLATOR_FAKE === '1',
  };
}
