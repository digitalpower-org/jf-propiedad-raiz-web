/**
 * Configuración de `next-intl` para peticiones de servidor.
 *
 * Sin middleware (D32 reserva `src/proxy.ts` para cerrar la superficie de
 * `/api`): el idioma se toma del segmento `[locale]` que el layout publica con
 * `setRequestLocale`, o del idioma por defecto si aún no se ha fijado.
 */

import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, isLocale } from './config';
import { loadMessages } from './messages';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: 'America/Bogota',
  };
});
