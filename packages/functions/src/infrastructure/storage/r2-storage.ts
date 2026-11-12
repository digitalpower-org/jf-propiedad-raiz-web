// R2 storage port (4.4)
// Puerto mínimo de almacenamiento sobre R2. Sin endpoints HTTP todavía:
// eso es US1.8/1.9 (MT2.1).

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { r2Client } from './r2-client';
import { r2Config, type R2Config } from './r2-config';

const DEFAULT_EXPIRES_IN = 900; // 15 minutos en segundos

function requireR2Config(): R2Config {
  if (!r2Config) {
    throw new Error('R2 no configurado: faltan variables de entorno R2_*');
  }
  return r2Config;
}

function requireR2Client(): S3Client {
  if (!r2Client) {
    throw new Error('R2 no configurado: faltan variables de entorno R2_*');
  }
  return r2Client;
}

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
  const cfg = requireR2Config();
  const client = requireR2Client();
  const command = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(client, command, { expiresIn });

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
  const cfg = requireR2Config();
  const client = requireR2Client();
  const command = new HeadObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });

  const response = await client.send(command);

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
  const cfg = requireR2Config();
  const client = requireR2Client();
  const command = new GetObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    Range: `bytes=${start}-${end}`,
  });

  const response = await client.send(command);

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
  const cfg = requireR2Config();
  const client = requireR2Client();
  const input: PutObjectCommandInput = {
    Bucket: cfg.bucket,
    Key: key,
    Body: body as unknown as NonNullable<PutObjectCommandInput['Body']>,
    ContentType: contentType,
  };

  const command = new PutObjectCommand(input);
  await client.send(command);
}

/**
 * Elimina un objeto de R2 (DELETE).
 */
export async function del(key: string): Promise<void> {
  const cfg = requireR2Config();
  const client = requireR2Client();
  const command = new DeleteObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
  });

  await client.send(command);
}

export { del as delete };
