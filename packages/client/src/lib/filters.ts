/**
 * Reexporta en el cliente los 8 presets de filtros de la consulta pública
 * (D28; tabla §5 de docs/ARCHITECTURE.md, AC1.10.4) desde `presets.json`
 * en la raíz de `@jf/shared-types`, junto con sus tipos.
 *
 * Punto único de consumo en la UI: los módulos de componentes importan
 * desde aquí, nunca desde `@jf/shared-types` en profundidad.
 */

import type {
  FilterPreset,
  FilterPresetId,
  FiltroBase,
  FiltroOpcional,
  FiltrosListado,
  PresetsFile,
} from '@jf/shared-types';
import presetsJson from '@jf/shared-types/presets.json';

/** Los 8 presets soportados, en el orden de la tabla §5 (un preset = un índice). */
export const presets = presetsJson as PresetsFile;

export type {
  FilterPreset,
  FilterPresetId,
  FiltroBase,
  FiltroOpcional,
  FiltrosListado,
  PresetsFile,
};
