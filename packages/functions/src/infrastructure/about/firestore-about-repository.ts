// Adaptador Firestore de `AboutRepository`.

import type { Firestore } from 'firebase-admin/firestore';

import type { AboutRepository, AboutDto, SeccionAbout, IntegranteEquipo } from '../../application/ports/about-repository';

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

export function createFirestoreAboutRepository(db: Firestore): AboutRepository {
  async function obtener(): Promise<AboutDto | null> {
    const snap = await db.doc(DOCUMENTO_NOSOTROS).get();
    if (!snap.exists) return null;
    return documentoAAboutDto(snap);
  }

  return { obtener };
}
