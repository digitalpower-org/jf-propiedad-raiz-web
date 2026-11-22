// Use case US6.3 — Obtener documento Nosotros.
// Devuelve el seed inyectado cuando el repositorio no encuentra documento (nunca 404).

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { AboutRepository, AboutDto } from '../../ports/about-repository';

export interface ObtenerAboutDeps {
  readonly about: AboutRepository;
  readonly seed: AboutDto;
  readonly logger: Logger;
}

export class ObtenerAboutUseCase implements UseCase<void, AboutDto> {
  private readonly about: AboutRepository;
  private readonly seed: AboutDto;
  private readonly logger: Logger;

  constructor(deps: ObtenerAboutDeps) {
    this.about = deps.about;
    this.seed = deps.seed;
    this.logger = deps.logger;
  }

  async execute(): Promise<AboutDto> {
    const resultado = await this.about.obtener();

    if (resultado === null) {
      this.logger.debug('about_obtenido', { encontrado: false, fallback: 'seed' });
      return this.seed;
    }

    this.logger.debug('about_obtenido', { encontrado: true });
    return resultado;
  }
}
