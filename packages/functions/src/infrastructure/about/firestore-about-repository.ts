// Adaptador Firestore de `AboutRepository`.

import type { Firestore } from 'firebase-admin/firestore';

import { ApiError } from '../../domain/errors/api-error';
import { errorCode } from '../../domain/errors/errorCatalog';
import type {
  AboutDto,
  AboutDtoInput,
  AboutRepository,
  IntegranteEquipo,
  SeccionAbout,
} from '../../application/ports/about-repository';

const DOCUMENTO_NOSOTROS = 'pages/nosotros';

function documentoAAboutDto(snap: { id: string; data(): unknown }): AboutDto {
  const data = snap.data() as Record<string, unknown>;

  const seccionesRaw = (data.secciones as unknown[]) ?? [];
  const secciones: SeccionAbout[] = seccionesRaw.map((s) => {
    const seccion = s as Record<string, unknown>;
    return {
      id: String(seccion.id ?? ''),
      titulo: {
        es: String((seccion.titulo as { es?: string })?.es ?? ''),
        en: (seccion.titulo as { en?: string })?.en,
      },
      cuerpo: {
        es: String((seccion.cuerpo as { es?: string })?.es ?? ''),
        en: (seccion.cuerpo as { en?: string })?.en,
      },
    };
  });

  const equipoRaw = (data.equipo as unknown[]) ?? [];
  const equipo: IntegranteEquipo[] = equipoRaw.map((e) => {
    const integrante = e as Record<string, unknown>;
    return {
      id: String(integrante.id ?? ''),
      nombre: String(integrante.nombre ?? ''),
      cargo: {
        es: String((integrante.cargo as { es?: string })?.es ?? ''),
        en: (integrante.cargo as { en?: string })?.en,
      },
      descripcion: integrante.descripcion
        ? {
            es: String((integrante.descripcion as { es?: string }).es),
            en: (integrante.descripcion as { en?: string })?.en,
          }
        : undefined,
      foto: (integrante.foto as string) ?? undefined,
    };
  });

  return {
    titulo: {
      es: String((data.titulo as { es?: string })?.es ?? ''),
      en: (data.titulo as { en?: string })?.en,
    },
    extracto: {
      es: String((data.extracto as { es?: string })?.es ?? ''),
      en: (data.extracto as { en?: string })?.en,
    },
    secciones,
    equipo,
    updatedAt: data.updatedAt ? toISO(data.updatedAt) : new Date().toISOString(),
  };
}

function toISO(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date(value as number).toISOString();
}

function toFirestoreTranslatable(input: {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
}): Record<string, unknown> {
  const result: Record<string, unknown> = { es: input.es };
  if (input.en !== undefined) result.en = input.en;
  if (input.autoTranslate !== undefined) result.autoTranslate = input.autoTranslate;
  return result;
}

function aboutDtoDesdeInput(input: AboutDtoInput, updatedAt: string): AboutDto {
  return {
    titulo: { es: input.titulo.es, en: input.titulo.en },
    extracto: { es: input.extracto.es, en: input.extracto.en },
    secciones: input.secciones.map((s) => ({
      id: s.id,
      titulo: { es: s.titulo.es, en: s.titulo.en },
      cuerpo: { es: s.cuerpo.es, en: s.cuerpo.en },
    })),
    equipo: input.equipo.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      cargo: { es: e.cargo.es, en: e.cargo.en },
      descripcion: e.descripcion ? { es: e.descripcion.es, en: e.descripcion.en } : undefined,
      foto: e.foto,
    })),
    updatedAt,
  };
}

export function createFirestoreAboutRepository(db: Firestore): AboutRepository {
  async function obtener(): Promise<AboutDto | null> {
    const snap = await db.doc(DOCUMENTO_NOSOTROS).get();
    if (!snap.exists) return null;
    return documentoAAboutDto(snap);
  }

  async function guardar(input: AboutDtoInput, expectedUpdatedAt: string): Promise<AboutDto> {
    const ahora = new Date().toISOString();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(db.doc(DOCUMENTO_NOSOTROS));
      if (!snap.exists) {
        throw new ApiError(errorCode.conflict, 'Documento Nosotros no existe');
      }
      const actual = snap.data() as Record<string, unknown>;
      if (String(actual.updatedAt ?? '') !== expectedUpdatedAt) {
        throw new ApiError(errorCode.conflict, 'updatedAt desactualizado');
      }

      tx.set(db.doc(DOCUMENTO_NOSOTROS), {
        titulo: toFirestoreTranslatable(input.titulo),
        extracto: toFirestoreTranslatable(input.extracto),
        secciones: input.secciones.map((s) => ({
          id: s.id,
          titulo: toFirestoreTranslatable(s.titulo),
          cuerpo: toFirestoreTranslatable(s.cuerpo),
        })),
        equipo: input.equipo.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          cargo: toFirestoreTranslatable(e.cargo),
          ...(e.descripcion !== undefined && {
            descripcion: toFirestoreTranslatable(e.descripcion),
          }),
          ...(e.foto !== undefined && { foto: e.foto }),
        })),
        updatedAt: ahora,
      });
    });

    return aboutDtoDesdeInput(input, ahora);
  }

  return { obtener, guardar };
}
