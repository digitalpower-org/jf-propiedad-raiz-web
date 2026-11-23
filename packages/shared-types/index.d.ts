export type EstadoPropiedad = 'ACTIVE' | 'HIDDEN' | 'DELETED';
export interface Foto {
  readonly derivados: readonly { readonly clave: string; readonly ancho: number; readonly alto: number }[];
}
export interface Translatable {
  readonly es: string;
  readonly en?: string;
  readonly autoTranslate?: boolean;
  readonly enPendiente?: boolean;
}
