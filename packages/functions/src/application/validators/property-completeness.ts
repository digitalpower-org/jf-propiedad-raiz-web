import type { PropertyDto } from '../ports/properties-repository';
import type { Foto } from '@jf/shared-types';
import { errorCode } from '../../domain/errors/errorCatalog';
import { ApiError } from '../../domain/errors/api-error';

export interface CompletenessResult {
  readonly isComplete: boolean;
  readonly missingFields: readonly { readonly field: string; readonly issue: string }[];
}

/**
 * Valida si un inmueble está completo para poder activarse.
 * Un inmueble completo tiene: operacion, tipo, titulo.es, departamento, municipio,
 * precio > 0 y al menos una foto.
 */
export function validatePropertyCompleteness(property: PropertyDto): CompletenessResult {
  const missing: { field: string; issue: string }[] = [];

  if (!property.operacion) {
    missing.push({ field: 'operacion', issue: 'Campo obligatorio' });
  }

  if (!property.tipo) {
    missing.push({ field: 'tipo', issue: 'Campo obligatorio' });
  }

  if (!property.titulo?.es?.trim()) {
    missing.push({ field: 'titulo.es', issue: 'Campo obligatorio' });
  }

  if (!property.departamento?.trim()) {
    missing.push({ field: 'departamento', issue: 'Campo obligatorio' });
  }

  if (!property.municipio?.trim()) {
    missing.push({ field: 'municipio', issue: 'Campo obligatorio' });
  }

  if (typeof property.precio !== 'number' || property.precio <= 0) {
    missing.push({ field: 'precio', issue: 'Debe ser mayor que 0' });
  }

  const fotos = property.fotos as readonly Foto[] | undefined;
  if (!fotos || fotos.length === 0) {
    missing.push({ field: 'fotos', issue: 'Se requiere al menos una foto' });
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Lanza un ApiError VALIDATION_ERROR con los campos faltantes si el inmueble no está completo.
 * Usado por activate y update (auto-activación).
 */
export function assertPropertyComplete(property: PropertyDto): void {
  const result = validatePropertyCompleteness(property);
  if (!result.isComplete) {
    throw new ApiError(
      errorCode.validationError,
      'Campos obligatorios para activar',
      result.missingFields,
    );
  }
}
