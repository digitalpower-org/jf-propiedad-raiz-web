// Puerto de persistencia de servicios (MT2.4).
// Implementado por Firestore.

import type { Translatable } from '@jf/shared-types';

export interface ServiceDto {
  readonly id: string;
  readonly slug: string;
  readonly status: 'ACTIVE' | 'HIDDEN' | 'DELETED';
  readonly titulo: Translatable;
  readonly resumen: Translatable;
  readonly cuerpo: Translatable;
  readonly orden: number;
  readonly fotos?: readonly unknown[];
  readonly updatedAt: string;
}

export interface ListarServicesResult {
  readonly items: readonly ServiceDto[];
}

export interface ServiciosRepository {
  readonly listar: () => Promise<ListarServicesResult>;
}
