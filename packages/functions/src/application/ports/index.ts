import type { AuthorizedUsersRepository } from './authorized-users-repository';
import type { IdentityVerifier } from './identity-verifier';
import type { Logger } from './logger';
import type { RevalidationGateway } from './revalidation-gateway';
import type { SecretComparator } from './secret-comparator';
import type { Translator } from './translator';

export type { AuthorizedUser, AuthorizedUsersRepository } from './authorized-users-repository';
export type { IdentityVerifier, VerifiedToken } from './identity-verifier';
export type { Logger } from './logger';
export type {
  RevalidateRequest,
  RevalidateResponse,
  RevalidationGateway,
  RevalidationResult,
} from './revalidation-gateway';
export type { SecretComparator } from './secret-comparator';
export type {
  TranslateResult,
  TranslationInput,
  TranslationOutput,
  Translator,
  TranslatorConfig,
} from './translator';

/** Agregado de puertos que consume `buildUseCases`. */
export interface ApplicationPorts {
  readonly logger: Logger;
  readonly translator: Translator;
  readonly revalidationGateway: RevalidationGateway;
  readonly identityVerifier: IdentityVerifier;
  readonly authorizedUsers: AuthorizedUsersRepository;
  readonly secretComparator: SecretComparator;
}
