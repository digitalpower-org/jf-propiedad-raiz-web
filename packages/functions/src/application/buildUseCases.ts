import type { ApplicationPorts } from './ports';
import { RevalidateContent } from './revalidation/revalidate-content';
import { TranslationService } from './translation/translation-service';
import { VerifyInternalSessionUseCase } from './use-cases/auth/verify-internal-session';

export interface UseCases {
  readonly verifyInternalSession: VerifyInternalSessionUseCase;
  readonly translationService: TranslationService;
  readonly revalidateContent: RevalidateContent;
}

/** Único lugar donde se construyen los casos de uso. */
export function buildUseCases(ports: ApplicationPorts): UseCases {
  return {
    verifyInternalSession: new VerifyInternalSessionUseCase(
      ports.identityVerifier,
      ports.authorizedUsers,
      ports.logger,
    ),
    translationService: new TranslationService({
      translator: ports.translator,
      logger: ports.logger,
    }),
    revalidateContent: new RevalidateContent({
      gateway: ports.revalidationGateway,
      logger: ports.logger,
    }),
  };
}
