import type { BackendSpec } from '@jf/shared-types';

type Operations = BackendSpec.operations;
type ContractStatus = {
  [K in keyof Operations]: keyof Operations[K]['responses'];
}[keyof Operations];

export type SuccessStatus = Extract<ContractStatus, 200 | 201 | 204>;
type ContractErrorStatus = Extract<
  ContractStatus,
  400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502
>;

// 405 lo genera el router cuando el método no está declarado; no aparece como
// respuesta de ninguna operación en la spec.
export type ErrorStatus = ContractErrorStatus | 405;
