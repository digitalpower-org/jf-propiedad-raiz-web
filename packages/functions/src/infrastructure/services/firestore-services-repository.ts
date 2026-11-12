// Adaptador Firestore de `ServiciosRepository`.

import type { Firestore } from 'firebase-admin/firestore';

import type { ServiciosRepository, ServiceDto, ListarServicesResult } from '../../application/ports/services-repository';

const COLECCION_SERVICIOS = 'services';

function documentoAServiceDto(snap: { id: string; data(): unknown }): ServiceDto {
  const data = snap.data() as Record<string, unknown>;

  return {
    id: snap.id,
    slug: String(data.slug ?? ''),
    status: (data.status ?? 'HIDDEN') as 'ACTIVE' | 'HIDDEN' | 'DELETED',
    titulo: {
      es: String((data.titulo as { es?: string })?.es ?? ''),
      en: (data.titulo as { en?: string })?.en,
    },
    resumen: {
      es: String((data.resumen as { es?: string })?.es ?? ''),
      en: (data.resumen as { en?: string })?.en,
    },
    cuerpo: {
      es: String((data.cuerpo as { es?: string })?.es ?? ''),
      en: (data.cuerpo as { en?: string })?.en,
    },
    orden: Number(data.orden ?? 0),
    fotos: data.fotos as readonly unknown[],
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

export function createFirestoreServicesRepository(db: Firestore): ServiciosRepository {
  const servicios = db.collection(COLECCION_SERVICIOS);

  async function listar(): Promise<ListarServicesResult> {
    const snap = await servicios
      .where('status', '==', 'ACTIVE')
      .orderBy('orden', 'asc')
      .get();

    return {
      items: snap.docs.map(documentoAServiceDto),
    };
  }

  return { listar };
}
