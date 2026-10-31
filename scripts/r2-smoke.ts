// Smoke test de R2 (4.5)
// Flujo: presign PUT → PUT 200 → head (content-type y tamaño) → range 0-127
// (magic bytes) → delete → 404. Verifica X-Amz-Expires=900.
//
// Requisitos:
// - Emulador R2 (MinIO/Silo) arriba en http://127.0.0.1:9000
// - Bucket `jf-media` creado (npm run r2:init)
// - Variables de entorno R2_* definidas (ver packages/functions/.env.example)
//
// Ejecutar:
//   R2_ENDPOINT=http://127.0.0.1:9000 \
//   R2_REGION=auto \
//   R2_ACCESS_KEY_ID=minioadmin \
//   R2_SECRET_ACCESS_KEY=minioadmin \
//   R2_BUCKET=jf-media \
//   R2_PUBLIC_BASE_URL=http://127.0.0.1:9000/jf-media \
//   npx tsx scripts/r2-smoke.ts

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client } from '../packages/functions/src/infrastructure/storage/r2-client';
import { r2Config } from '../packages/functions/src/infrastructure/storage/r2-config';

const TEST_KEY = `smoke-test/${Date.now()}.bin`;
const TEST_BODY = Buffer.from('hello-r2-smoke-test-1234567890', 'utf8');
const TEST_CONTENT_TYPE = 'application/octet-stream';
const EXPECTED_EXPIRES_IN = 900;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

async function main(): Promise<void> {
  console.log(`🔑 Usando bucket: ${r2Config.bucket}`);
  console.log(`🗝️  Endpoint: ${r2Config.endpoint}`);
  console.log(`🔑 Clave de prueba: ${TEST_KEY}\n`);

  // 1. Presign PUT
  const putCommand = new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: TEST_KEY,
    ContentType: TEST_CONTENT_TYPE,
  });
  const presignedUrl = await getSignedUrl(r2Client, putCommand, {
    expiresIn: EXPECTED_EXPIRES_IN,
  });

  const urlObj = new URL(presignedUrl);
  const expiresParam = urlObj.searchParams.get('X-Amz-Expires');
  assert(
    expiresParam === String(EXPECTED_EXPIRES_IN),
    `X-Amz-Expires=${EXPECTED_EXPIRES_IN} (obtenido: ${expiresParam ?? 'ausente'})`,
  );
  console.log(`   URL presignada: ${presignedUrl.substring(0, 120)}...\n`);

  // 2. PUT 200 usando la URL presignada
  const putResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': TEST_CONTENT_TYPE },
    body: TEST_BODY,
  });
  assert(
    putResponse.status === 200,
    `PUT presignado devolvió 200 (obtenido: ${putResponse.status})`,
  );
  console.log(`   PUT status: ${putResponse.status}\n`);

  // 3. HEAD: verificar content-type y tamaño
  const headCommand = new HeadObjectCommand({
    Bucket: r2Config.bucket,
    Key: TEST_KEY,
  });
  const headResponse = await r2Client.send(headCommand);
  assert(
    headResponse.ContentType === TEST_CONTENT_TYPE,
    `Content-Type correcto: ${TEST_CONTENT_TYPE} (obtenido: ${headResponse.ContentType})`,
  );
  assert(
    headResponse.ContentLength === TEST_BODY.length,
    `Content-Length correcto: ${TEST_BODY.length} bytes (obtenido: ${headResponse.ContentLength})`,
  );
  console.log(`   HEAD Content-Type: ${headResponse.ContentType}`);
  console.log(`   HEAD Content-Length: ${headResponse.ContentLength} bytes\n`);

  // 4. Range 0-127: verificar magic bytes (primeros 128 bytes)
  const rangeCommand = new GetObjectCommand({
    Bucket: r2Config.bucket,
    Key: TEST_KEY,
    Range: 'bytes=0-127',
  });
  const rangeResponse = await r2Client.send(rangeCommand);
  const rangeChunks: Uint8Array[] = [];
  const body = rangeResponse.Body as NodeJS.ReadableStream;
  for await (const chunk of body) {
    rangeChunks.push(chunk);
  }
  const rangeBody = Buffer.concat(rangeChunks.map((c) => Buffer.from(c)));
  const expectedRange = TEST_BODY.slice(0, 128);
  assert(
    rangeBody.equals(expectedRange),
    `Range 0-127 devuelve los primeros ${expectedRange.length} bytes correctamente`,
  );
  console.log(`   Range 0-127: ${rangeBody.length} bytes, coinciden con el original\n`);

  // 5. DELETE
  const deleteCommand = new DeleteObjectCommand({
    Bucket: r2Config.bucket,
    Key: TEST_KEY,
  });
  await r2Client.send(deleteCommand);
  console.log(`   DELETE ejecutado para ${TEST_KEY}\n`);

  // 6. Verificar 404 tras delete
  const headAfterDelete = new HeadObjectCommand({
    Bucket: r2Config.bucket,
    Key: TEST_KEY,
  });
  let headAfterDeleteError: Error | undefined;
  try {
    await r2Client.send(headAfterDelete);
  } catch (err) {
    headAfterDeleteError = err as Error;
  }
  const isNotFound =
    headAfterDeleteError !== undefined &&
    (headAfterDeleteError as { name?: string; $metadata?: { httpStatusCode?: number } }).name ===
      'NotFound';
  assert(isNotFound, 'HEAD tras DELETE devuelve 404 (NotFound)');
  console.log(`   Estado tras delete: objeto no encontrado (404)\n`);

  console.log('🎉 Smoke test de R2 completado con éxito.');
}

main().catch((err) => {
  console.error('💥 Smoke test falló:', err);
  process.exit(1);
});
