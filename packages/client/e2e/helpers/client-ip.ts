import { test as base } from '@playwright/test';

export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';

// El limitador del backend cuenta las lecturas públicas por IP del visitante y por ruta
// (X-Client-IP, que el BFF toma del primer valor de x-forwarded-for). En el Gate 8 todas las
// pruebas salían de la misma IP y agotaban el cupo de 60 listados por minuto: fallaban al azar
// con 429 RATE_LIMITED. Cada prueba recibe una IP propia, como un visitante real.
let secuencia = 0;

export const test = base.extend({
  // «usar» y no «use»: la regla react-hooks/rules-of-hooks confunde el `use` de Playwright con el de React.
  context: async ({ context }, usar, testInfo) => {
    secuencia += 1;
    const ip = `10.${testInfo.workerIndex % 256}.${(secuencia >> 8) & 255}.${secuencia & 255}`;
    await context.setExtraHTTPHeaders({ 'x-forwarded-for': ip });
    await usar(context);
  },
});
