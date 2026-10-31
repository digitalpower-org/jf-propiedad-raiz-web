// R2 client (4.3)
// Un único S3Client centralizado para todo el backend. Evita que cada
// endpoint configure el SDK de forma distinta y controla que el SDK no
// firme x-amz-checksum-crc32 dentro de la URL presignada (R2 puede
// rechazarlo; Silo lo toleraba).

import { S3Client } from '@aws-sdk/client-s3';
import { r2Config } from './r2-config';

export const r2Client = new S3Client({
  region: r2Config.region,
  endpoint: r2Config.endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: r2Config.accessKeyId,
    secretAccessKey: r2Config.secretAccessKey,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
