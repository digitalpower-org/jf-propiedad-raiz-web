import type { AuthorizedUsersRepository } from './authorized-users-repository';
import type { EmailSender } from './email-sender';
import type { IdentityVerifier } from './identity-verifier';
import type { ImageProcessor } from './image-processor';
import type { Logger } from './logger';
import type { MediaStorage } from './media-storage';
import type { PropertiesRepository } from './properties-repository';
import type { RateLimiter } from './rate-limiter';
import type { RevalidationGateway } from './revalidation-gateway';
import type { SecretComparator } from './secret-comparator';
import type { ServiciosRepository } from './services-repository';
import type { AboutRepository } from './about-repository';
import type { Translator } from './translator';

export type { AuthorizedUser, AuthorizedUsersRepository } from './authorized-users-repository';
export type { EmailSender } from './email-sender';
export type { IdentityVerifier, VerifiedToken } from './identity-verifier';
export type { ImageProcessor } from './image-processor';
export type { Logger } from './logger';
export type { MediaStorage } from './media-storage';
export type { PropertiesRepository } from './properties-repository';
export type { RateLimiter } from './rate-limiter';
export type {
  RevalidateRequest,
  RevalidateResponse,
  RevalidationGateway,
  RevalidationResult,
} from './revalidation-gateway';
export type { SecretComparator } from './secret-comparator';
export type { ServiciosRepository } from './services-repository';
export type { AboutRepository } from './about-repository';
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
  readonly properties: PropertiesRepository;
  readonly services: ServiciosRepository;
  readonly about: AboutRepository;
  readonly mediaStorage: MediaStorage;
  readonly imageProcessor: ImageProcessor;
  readonly emailSender: EmailSender;
  readonly rateLimiter: RateLimiter;
}
