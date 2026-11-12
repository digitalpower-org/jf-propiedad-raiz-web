// R2 client (4.3)
// Un único S3Client centralizado para todo el backend. Evita que cada
// endpoint configure el SDK de forma distinta y controla que el SDK no
// firme x-amz-checksum-crc32 dentro de la URL presignada (R2 puede
// rechazarlo; Silo lo toleraba).
//
// Las credenciales de R2 se leen de la configuración centralizada
// (`src/infrastructure/config/server-config.ts`), que valida al cargar el
// módulo y falla rápido si falta alguna variable.

import { S3Client } from '@aws-sdk/client-s3';

import { config } from '../config/server-config';

export const r2Client = new S3Client({
  region: config.r2.region,
  endpoint: config.r2.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
