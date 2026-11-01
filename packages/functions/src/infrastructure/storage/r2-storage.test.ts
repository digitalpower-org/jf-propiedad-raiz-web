// R2 storage port tests (4.4)

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const { sendMock, getSignedUrlMock, r2ClientMock } = vi.hoisted(() => {
  const sendMock = vi.fn();
  const getSignedUrlMock = vi.fn();
  const r2ClientMock = { send: sendMock };
  return { sendMock, getSignedUrlMock, r2ClientMock };
});

vi.mock('./r2-client', () => ({ r2Client: r2ClientMock }));
vi.mock('./r2-config', () => ({
  r2Config: {
    endpoint: 'https://account-id.r2.cloudflarestorage.com',
    region: 'auto',
    accessKeyId: 'access-key-id',
    secretAccessKey: 'secret-access-key',
    bucket: 'jf-media',
    publicBaseUrl: 'https://media.example.com',
  },
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { del, getRange, head, presignPut, put } from './r2-storage';
import * as storage from './r2-storage';

beforeEach(() => {
  sendMock.mockReset();
  getSignedUrlMock.mockReset();
});

describe('presignPut (4.4)', () => {
  it('firma un PutObjectCommand con los datos del objeto', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example.com/upload');

    const result = await presignPut('properties/casa-1/foto.jpg', 'image/jpeg');

    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const [client, command, options] = getSignedUrlMock.mock.calls[0]!;
    expect(client).toBe(r2ClientMock);
    if (!(command instanceof PutObjectCommand)) {
      throw new Error('se esperaba un PutObjectCommand');
    }
    expect(command.input).toEqual({
      Bucket: 'jf-media',
      Key: 'properties/casa-1/foto.jpg',
      ContentType: 'image/jpeg',
    });
    expect(options).toEqual({ expiresIn: 900 });

    expect(result).toEqual({
      url: 'https://signed.example.com/upload',
      headers: { 'Content-Type': 'image/jpeg' },
      expiresIn: 900,
    });
  });

  it('respeta el expiresIn indicado', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed.example.com/upload');

    const result = await presignPut('key', 'text/plain', 120);

    const [, , options] = getSignedUrlMock.mock.calls[0]!;
    expect(options).toEqual({ expiresIn: 120 });
    expect(result.expiresIn).toBe(120);
  });

  it('propaga errores al firmar', async () => {
    getSignedUrlMock.mockRejectedValue(new Error('signing failed'));

    await expect(presignPut('key', 'text/plain')).rejects.toThrow('signing failed');
  });
});

describe('head (4.4)', () => {
  it('envía HeadObjectCommand y mapea los metadatos', async () => {
    const lastModified = new Date('2026-01-02T03:04:05.000Z');
    sendMock.mockResolvedValue({
      ContentType: 'image/jpeg',
      ContentLength: 1234,
      LastModified: lastModified,
    });

    const result = await head('properties/casa-1/foto.jpg');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]![0];
    if (!(command instanceof HeadObjectCommand)) {
      throw new Error('se esperaba un HeadObjectCommand');
    }
    expect(command.input).toEqual({
      Bucket: 'jf-media',
      Key: 'properties/casa-1/foto.jpg',
    });

    expect(result).toEqual({
      contentType: 'image/jpeg',
      contentLength: 1234,
      lastModified,
    });
  });

  it('mapea campos ausentes como undefined', async () => {
    sendMock.mockResolvedValue({});

    const result = await head('key');

    expect(result).toEqual({
      contentType: undefined,
      contentLength: undefined,
      lastModified: undefined,
    });
  });

  it('propaga errores de S3', async () => {
    sendMock.mockRejectedValue(new Error('head failed'));

    await expect(head('key')).rejects.toThrow('head failed');
  });
});

describe('getRange (4.4)', () => {
  it('envía GetObjectCommand con el rango solicitado', async () => {
    const body = new ReadableStream<Uint8Array>();
    sendMock.mockResolvedValue({
      Body: body,
      ContentType: 'video/mp4',
      ContentLength: 500,
    });

    const result = await getRange('videos/tour.mp4', 0, 499);

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]![0];
    if (!(command instanceof GetObjectCommand)) {
      throw new Error('se esperaba un GetObjectCommand');
    }
    expect(command.input).toEqual({
      Bucket: 'jf-media',
      Key: 'videos/tour.mp4',
      Range: 'bytes=0-499',
    });

    expect(result.body).toBe(body);
    expect(result.contentType).toBe('video/mp4');
    expect(result.contentLength).toBe(500);
  });

  it('mapea campos ausentes como undefined', async () => {
    sendMock.mockResolvedValue({});

    const result = await getRange('key', 10, 20);

    expect(result.contentType).toBeUndefined();
    expect(result.contentLength).toBeUndefined();
    expect(result.body).toBeUndefined();
  });

  it('propaga errores de S3', async () => {
    sendMock.mockRejectedValue(new Error('range failed'));

    await expect(getRange('key', 0, 1)).rejects.toThrow('range failed');
  });
});

describe('put (4.4)', () => {
  it('envía PutObjectCommand con cuerpo y content type', async () => {
    const body = Buffer.from('contenido');
    sendMock.mockResolvedValue({});

    await put('properties/casa-1/nota.txt', body, 'text/plain');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]![0];
    if (!(command instanceof PutObjectCommand)) {
      throw new Error('se esperaba un PutObjectCommand');
    }
    expect(command.input).toEqual({
      Bucket: 'jf-media',
      Key: 'properties/casa-1/nota.txt',
      Body: body,
      ContentType: 'text/plain',
    });
  });

  it('propaga errores de S3', async () => {
    sendMock.mockRejectedValue(new Error('put failed'));

    await expect(put('key', 'data', 'text/plain')).rejects.toThrow('put failed');
  });
});

describe('del / delete (4.4)', () => {
  it('envía DeleteObjectCommand para la clave indicada', async () => {
    sendMock.mockResolvedValue({});

    await del('properties/casa-1/foto.jpg');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0]![0];
    if (!(command instanceof DeleteObjectCommand)) {
      throw new Error('se esperaba un DeleteObjectCommand');
    }
    expect(command.input).toEqual({
      Bucket: 'jf-media',
      Key: 'properties/casa-1/foto.jpg',
    });
  });

  it('exporta el alias delete con el mismo comportamiento', async () => {
    sendMock.mockResolvedValue({});

    expect(storage.delete).toBe(storage.del);

    await storage.delete('key');

    const command = sendMock.mock.calls[0]![0];
    if (!(command instanceof DeleteObjectCommand)) {
      throw new Error('se esperaba un DeleteObjectCommand');
    }
    expect(command.input).toEqual({ Bucket: 'jf-media', Key: 'key' });
  });

  it('propaga errores de S3', async () => {
    sendMock.mockRejectedValue(new Error('delete failed'));

    await expect(del('key')).rejects.toThrow('delete failed');
  });
});
