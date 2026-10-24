import type { ErrorCode } from '@jf/shared-types';

export type HealthBody = {
  readonly status: 'ok';
  readonly service: 'functions';
};

export const HEALTH_OK: HealthBody = { status: 'ok', service: 'functions' };

/**
 * Import de tipos deliberado (MT0.5): demuestra en el build de Functions que
 * `@jf/shared-types` resuelve en el despliegue. Se borra al compilar.
 */
export type HealthFailureCode = Extract<ErrorCode, 'INTERNAL'>;
