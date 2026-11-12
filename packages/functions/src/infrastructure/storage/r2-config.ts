// R2 configuration (4.2)
// Valida las variables de entorno R2_* con Zod y falla rápido con mensaje
// claro si falta algo. Sin esto, el primer error aparece como un 500 opaco
// en tiempo de ejecución.

import { z } from 'zod';

const R2EnvSchema = z.object({
  R2_ENDPOINT: z.string().url('R2_ENDPOINT debe ser una URL válida'),
  R2_REGION: z.string().min(1, 'R2_REGION es obligatorio (ej. "auto")'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID es obligatorio'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY es obligatorio'),
  R2_BUCKET: z.string().min(1, 'R2_BUCKET es obligatorio'),
  R2_PUBLIC_BASE_URL: z.string().url('R2_PUBLIC_BASE_URL debe ser una URL válida'),
});

const parsed = R2EnvSchema.safeParse(process.env);

export const r2Config = parsed.success
  ? ({
      endpoint: parsed.data.R2_ENDPOINT,
      region: parsed.data.R2_REGION,
      accessKeyId: parsed.data.R2_ACCESS_KEY_ID,
      secretAccessKey: parsed.data.R2_SECRET_ACCESS_KEY,
      bucket: parsed.data.R2_BUCKET,
      publicBaseUrl: parsed.data.R2_PUBLIC_BASE_URL,
    } as const)
  : null;

export type R2Config = NonNullable<typeof r2Config>;
