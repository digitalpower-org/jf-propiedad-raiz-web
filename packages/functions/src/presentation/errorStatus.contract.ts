import type { ErrorCodeTable } from '@jf/shared-types';


type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type StatusTableMatchesSharedTypes = Assert<
  Equal<typeof import('./errorStatus').STATUS_BY_CODE, ErrorCodeTable>
>;
