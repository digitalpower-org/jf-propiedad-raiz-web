/**
 * Paridad de compilación entre el catálogo local y el contrato OpenAPI (B2, E3).
 *
 * Solo tipos: no genera runtime. Si se añade o elimina un código en uno de los
 * dos lados, `tsc` falla.
 */
import type { BackendSpec } from '@jf/shared-types';

import type { ErrorCode } from './errorCatalog';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

type ContractErrorCode = BackendSpec.components['schemas']['ErrorCode'];

export type ErrorCodesMatchOpenApi = Assert<Equal<ErrorCode, ContractErrorCode>>;
