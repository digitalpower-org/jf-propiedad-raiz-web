// R2 storage port (4.4)
// Puerto mínimo de almacenamiento sobre R2. Sin endpoints HTTP todavía:
// eso es US1.8/1.9 (MT2.1).

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { r2Client } from './r2-client';
import { r2Config } from './r2-config';

const DEFAULT_EXPIRES_IN = 900; // 15 minutos en segundos

export interface PresignPutResult {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly expiresIn: number;
}

export interface HeadObjectResult {
  readonly contentType: string | undefined;
  readonly contentLength: number | undefined;
  readonly lastModified: Date | undefined;
}

export interface GetRangeResult {
  readonly body: ReadableStream<Uint8Array> | NodeJS.ReadableStream;
  readonly contentType: string | undefined;
  readonly contentLength: number | undefined;
}

/**
 * Genera una URL presignada para subir un objeto a R2 (PUT).
 * Devuelve también los headers que el cliente debe enviar en la PUT.
 */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn: number = DEFAULT_EXPIRES_IN,
): Promise<PresignPutResult> {
  const command = new PutObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn });

  return {
    url,
    headers: {
      'Content-Type': contentType,
    },
    expiresIn,
  };
}

/**
 * Obtiene metadatos de un objeto (HEAD).
 */
export async function head(key: string): Promise<HeadObjectResult> {
  const command = new HeadObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
  });

  const response = await r2Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
  };
}

/**
 * Obtiene un rango de bytes de un objeto (GET con Range).
 */
export async function getRange(key: string, start: number, end: number): Promise<GetRangeResult> {
  const command = new GetObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
    Range: `bytes=${start}-${end}`,
  });

  const response = await r2Client.send(command);

  return {
    body: response.Body as ReadableStream<Uint8Array> | NodeJS.ReadableStream,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/**
 * Sube un objeto a R2 (PUT).
 */
export async function put(
  key: string,
  body: Buffer | Uint8Array | string | NodeJS.ReadableStream | ReadableStream<Uint8Array>,
  contentType: string,
): Promise<void> {
  const input: PutObjectCommandInput = {
    Bucket: r2Config.bucket,
    Key: key,
    Body: body as unknown as NonNullable<PutObjectCommandInput['Body']>,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(input);
  await r2Client.send(command);
}

/**
 * Elimina un objeto de R2 (DELETE).
 */
export async function del(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: r2Config.bucket,
    Key: key,
  });

  await r2Client.send(command);
}

export { del as delete };
