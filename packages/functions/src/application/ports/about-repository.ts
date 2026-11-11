// Puerto de persistencia del documento Nosotros (MT2.4).
// Implementado por Firestore.

import type { Translatable } from '@jf/shared-types';

export interface SeccionAbout {
  readonly id: string;
  readonly titulo: Translatable;
  readonly cuerpo: Translatable;
}

export interface IntegranteEquipo {
  readonly id: string;
  readonly nombre: string;
  readonly cargo: Translatable;
  readonly descripcion?: Translatable;
  readonly foto?: string;
}

export interface AboutDto {
  readonly titulo: Translatable;
  readonly extracto: Translatable;
  readonly secciones: readonly SeccionAbout[];
  readonly equipo: readonly IntegranteEquipo[];
  readonly updatedAt: string;
}

export interface AboutRepository {
  readonly obtener: () => Promise<AboutDto | null>;
}
