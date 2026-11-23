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
import { NotFound, NoSuchKey } from '@aws-sdk/client-s3';
import {
  R2_PREFIX_PENDING,
  R2_PREFIX_DERIVADOS,
  R2_PRESIGN_EXPIRES_SECONDS,
  R2_MIME_WEBP,
  R2_MIME_JPEG,
} from './constants';
import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';

/**
 * Wrapper sobre `r2Head` que traduce errores de objeto no encontrado
 * (NotFound / NoSuchKey del SDK de AWS) a `ApiError` con código NOT_FOUND.
 * Otros errores se relanzan sin cambios.
 */
async function headObjeto(key: string): Promise<Awaited<ReturnType<typeof r2Head>>> {
  try {
    return await r2Head(key);
  } catch (error) {
    if (error instanceof NotFound || error instanceof NoSuchKey) {
      throw new ApiError(errorCode.notFound, 'Objeto pendiente no encontrado');
    }
    throw error;
  }
}

/**
 * Adaptador de `MediaStorage` sobre Cloudflare R2 (US1.8, US1.9).
 *
 * Orquesta: presignar URL de subida → obtener objeto de R2 → validar con
 * Sharp → generar derivados WebP → subir derivados a R2 → eliminar original
 * de `pending/`.
 *
 * Atomicidad: genera todos los buffers primero, sube todos; si falla uno,
 * limpia los ya subidos y conserva el original. Elimina el original solo
 * al final si todo tuvo éxito.
 */
export function createR2MediaStorage(imageProcessor: ImageProcessor): MediaStorage {
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
    // 1) Validar prefijo pending/ antes de cualquier HEAD/GET
    if (!key.startsWith(R2_PREFIX_PENDING)) {
      throw new ApiError(errorCode.validationError, 'Clave inválida: debe comenzar con pending/', [
        { field: 'key', issue: 'La clave debe estar en pending/' },
      ]);
    }

    // 2) Obtener metadatos del objeto en R2 (HEAD)
    const metadatos = await headObjeto(key);
    const mimeType = metadatos.contentType ?? R2_MIME_JPEG;

    // 3) Descargar el objeto completo de R2 en chunks
    const buffer = await descargarObjetoEntero(key);

    // 4) Validar con Sharp
    await imageProcessor.validarImagen(buffer, mimeType);

    // 5) Generar derivados WebP (buffers en memoria)
    const claveBase = `${key.replace(new RegExp(`^${R2_PREFIX_PENDING}`), '').replace(/\.[^/.]+$/, '')}`;
    const { derivados } = await imageProcessor.generarDerivados(buffer, claveBase);

    // 6) Subir cada derivado a R2 bajo derivados/<recurso>/
    // Atomicidad: si falla alguno, limpiar los ya subidos y NO borrar el original
    const clavesSubidas: string[] = [];
    try {
      for (const derivado of derivados) {
        const claveDerivado = `${R2_PREFIX_DERIVADOS}${recurso}/${derivado.clave}`;
        await r2Put(claveDerivado, derivado.buffer, R2_MIME_WEBP);
        clavesSubidas.push(claveDerivado);
      }
    } catch (error) {
      // Limpiar derivados ya subidos
      for (const claveSubida of clavesSubidas) {
        try {
          await r2Del(claveSubida);
        } catch {
          // Best effort: log pero no fallar la limpieza
        }
      }
      // Re-lanzar el error original (será INTERNAL si es error de infraestructura)
      throw error;
    }

    // 7) Solo si todos los derivados se subieron OK, eliminar el original de pending/
    await r2Del(key);

    return {
      derivados: derivados.map((d) => ({
        clave: d.clave,
        ancho: d.ancho,
        alto: d.alto,
      })),
    };
  }

  async function deleteDerivados(claves: readonly string[], recurso: RecursoMedia): Promise<void> {
    for (const clave of claves) {
      await r2Del(`${R2_PREFIX_DERIVADOS}${recurso}/${clave}`);
    }
  }

  return { presignPut, confirmarSubida, deleteDerivados };
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
  const metadatos = await headObjeto(key);
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
