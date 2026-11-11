// Use case US6.3 — Obtener documento Nosotros.

import type { UseCase } from '../../use-case';
import type { Logger } from '../../ports/logger';
import type { AboutRepository, AboutDto } from '../../ports/about-repository';

export class ObtenerAboutUseCase implements UseCase<void, AboutDto | null> {
  constructor(
    private readonly about: AboutRepository,
    private readonly logger: Logger,
  ) {}

  async execute(): Promise<AboutDto | null> {
    const resultado = await this.about.obtener();

    this.logger.debug('about_obtenido', { encontrado: resultado !== null });

    return resultado;
  }
}
