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

export interface AboutDtoInput {
  readonly titulo: { readonly es: string; readonly en?: string; readonly autoTranslate?: boolean };
  readonly extracto: {
    readonly es: string;
    readonly en?: string;
    readonly autoTranslate?: boolean;
  };
  readonly secciones: readonly {
    readonly id: string;
    readonly titulo: {
      readonly es: string;
      readonly en?: string;
      readonly autoTranslate?: boolean;
    };
    readonly cuerpo: {
      readonly es: string;
      readonly en?: string;
      readonly autoTranslate?: boolean;
    };
  }[];
  readonly equipo: readonly {
    readonly id: string;
    readonly nombre: string;
    readonly cargo: { readonly es: string; readonly en?: string; readonly autoTranslate?: boolean };
    readonly descripcion?: {
      readonly es: string;
      readonly en?: string;
      readonly autoTranslate?: boolean;
    };
    readonly foto?: string;
  }[];
}

export interface AboutRepository {
  readonly obtener: () => Promise<AboutDto | null>;
  readonly guardar: (input: AboutDtoInput, expectedUpdatedAt: string) => Promise<AboutDto>;
}
