import 'server-only';
import type { Translatable } from '@jf/shared-types';
import { backendUrl } from '@/server/backend-url';
import { env } from '@/server/config/server-config';

/** Documento de `/api/v1/about` según el contrato: `foto` es una clave de R2. */
export interface AboutData {
  readonly titulo: Translatable;
  readonly extracto: Translatable;
  readonly secciones: readonly {
    readonly id: string;
    readonly titulo: Translatable;
    readonly cuerpo: Translatable;
  }[];
  readonly equipo: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cargo: Translatable;
    readonly descripcion?: Translatable;
    readonly foto?: string;
  }[];
}

interface AboutBody {
  success?: boolean;
  data?: unknown;
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

// Comprueba solo la forma de primer nivel que la página necesita para decidir qué pintar.
function esAbout(datos: unknown): datos is AboutData {
  return (
    esObjeto(datos) &&
    esObjeto(datos.titulo) &&
    esObjeto(datos.extracto) &&
    Array.isArray(datos.secciones) &&
    Array.isArray(datos.equipo)
  );
}

/**
 * Documento completo de «Nosotros» (US5.6), leído del backend directo y sin caché.
 * Devuelve `null` solo si el documento no existe (404, estado vacío de AC5.6.3); cualquier otro
 * fallo o una respuesta con otra forma lanza, para no confundir un error con «vacío».
 */
export async function fetchAboutServer(): Promise<AboutData | null> {
  const res = await fetch(backendUrl('/api/v1/about'), {
    headers: { 'X-Internal-Key': env.BFF_INTERNAL_KEY, Accept: 'application/json' },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`El backend respondió ${res.status} al pedir «Nosotros».`);
  }

  const cuerpo = (await res.json()) as AboutBody;
  if (!cuerpo.success || !esAbout(cuerpo.data)) {
    throw new Error('Respuesta inesperada del backend al pedir «Nosotros».');
  }
  return cuerpo.data;
}
