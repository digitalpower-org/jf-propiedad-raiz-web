import type { MediaStorage } from '../../application/ports/media-storage';
import type { ImageProcessor } from '../../application/ports/image-processor';
import type { RecursoMedia } from '@jf/shared-types';
import {
  presignPut as r2PresignPut,
  head as r2Head,
  put as r2Put,
  del as r2Del,
  getRange as r2GetRange,
  type PresignPutResult as R2PresignPutResult,
} from '../storage/r2-storage';
import {
  R2_PREFIX_PENDING,
  R2_PREFIX_DERIVADOS,
  R2_PRESIGN_EXPIRES_SECONDS,
  R2_MIME_WEBP,
  R2_MIME_JPEG,
} from './constants';

/**
 * Adaptador de `MediaStorage` sobre Cloudflare R2 (US1.8, US1.9).
 *
 * Orquesta: presignar URL de subida → obtener objeto de R2 → validar con
 * Sharp → generar derivados WebP → subir derivados a R2 → eliminar original
 * de `pending/`.
 */
export function createR2MediaStorage(
  imageProcessor: ImageProcessor,
): MediaStorage {
  async function presignPut(
    nombre: string,
    mimeType: string,
  ): Promise<{
    readonly url: string;
    readonly key: string;
    readonly expiresInSeconds: number;
  }> {
    const clave = `${R2_PREFIX_PENDING}${crypto.randomUUID()}.${extensionDe(nombre)}`;

    const resultado: R2PresignPutResult = await r2PresignPut(
      clave,
      mimeType,
      R2_PRESIGN_EXPIRES_SECONDS,
    );

    return {
      url: resultado.url,
      key: clave,
      expiresInSeconds: resultado.expiresIn,
    };
  }

  async function confirmarSubida(
    key: string,
    recurso: RecursoMedia,
  ): Promise<{
    readonly derivados: readonly {
      readonly clave: string;
      readonly ancho: number;
    }[];
  }> {
    // 1) Obtener metadatos del objeto en R2 (HEAD)
    const metadatos = await r2Head(key);
    const mimeType = metadatos.contentType ?? R2_MIME_JPEG;

    // 2) Descargar el objeto completo de R2 en chunks
    const buffer = await descargarObjetoEntero(key);

    // 3) Validar con Sharp
    await imageProcessor.validarImagen(buffer, mimeType);

    // 4) Generar derivados WebP (buffers en memoria)
    const claveBase = `${key.replace(new RegExp(`^${R2_PREFIX_PENDING}`), '').replace(/\.[^/.]+$/, '')}`;
    const { derivados } = await imageProcessor.generarDerivados(
      buffer,
      claveBase,
    );

    // 5) Subir cada derivado a R2 bajo derivados/<recurso>/
    for (const derivado of derivados) {
      await r2Put(
        `${R2_PREFIX_DERIVADOS}${recurso}/${derivado.clave}`,
        derivado.buffer,
        R2_MIME_WEBP,
      );
    }

    // 6) Eliminar el original de pending/
    await r2Del(key);

    return {
      derivados: derivados.map(
        (d: { readonly clave: string; readonly ancho: number }) => ({
          clave: d.clave,
          ancho: d.ancho,
        }),
      ),
    };
  }

  return { presignPut, confirmarSubida };
}

/** Extrae la extensión de un nombre de archivo. */
function extensionDe(nombre: string): string {
  const partes = nombre.split('.');
  return partes.length > 1 ? partes[partes.length - 1]! : 'bin';
}

/**
 * Descarga un objeto entero de R2 en chunks usando getRange y lo devuelve como Buffer.
 */
async function descargarObjetoEntero(key: string): Promise<Buffer> {
  const metadatos = await r2Head(key);
  const total = Number(metadatos.contentLength ?? 0);
  const CHUNK = 1024 * 1024; // 1 MB por tramo

  const chunks: Buffer[] = [];
  let inicio = 0;

  while (inicio < total) {
    const fin = Math.min(inicio + CHUNK - 1, total - 1);
    const rango = await r2GetRange(key, inicio, fin);
    const chunk = await streamToBuffer(rango.body);
    chunks.push(chunk);
    inicio = fin + 1;
  }

  return Buffer.concat(chunks);
}

/** Convierte un ReadableStream a Buffer. */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
