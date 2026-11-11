import type { BackendSpec } from '@jf/shared-types';

type ContractPath = keyof BackendSpec.paths;

type ToExpressPath<P extends string> = P extends `${infer Head}{${infer Param}}${infer Tail}`
  ? `${Head}:${Param}${ToExpressPath<Tail>}`
  : P;

export type ExpressPath = ToExpressPath<ContractPath>;

export const API_PATHS = {
  verifyInternalSession: '/internal/auth/verify' satisfies ExpressPath,
  properties: '/api/v1/properties' satisfies ExpressPath,
  featuredProperties: '/api/v1/properties/featured' satisfies ExpressPath,
  property: '/api/v1/properties/:idOrSlug' satisfies ExpressPath,
  activateProperty: '/api/v1/properties/:idOrSlug/activate' satisfies ExpressPath,
  hideProperty: '/api/v1/properties/:idOrSlug/hide' satisfies ExpressPath,
  presignedMediaUrl: '/api/v1/media/presigned-url' satisfies ExpressPath,
  confirmMedia: '/api/v1/media/confirm' satisfies ExpressPath,
  consignments: '/api/v1/consignments' satisfies ExpressPath,
  services: '/api/v1/services' satisfies ExpressPath,
  service: '/api/v1/services/:idOrSlug' satisfies ExpressPath,
  activateService: '/api/v1/services/:idOrSlug/activate' satisfies ExpressPath,
  hideService: '/api/v1/services/:idOrSlug/hide' satisfies ExpressPath,
  reorderServices: '/api/v1/services/reorder' satisfies ExpressPath,
  about: '/api/v1/about' satisfies ExpressPath,
} as const;

export const OPS_PATHS = {
  health: '/health',
} as const;
