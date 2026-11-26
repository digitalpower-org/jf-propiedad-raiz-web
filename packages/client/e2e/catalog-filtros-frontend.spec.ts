import { expect, test, type Page } from '@playwright/test';

// Gate 7 (sin backend): /api/properties se simula en el navegador.
// US2.2 (PR-B): dormitorios, baños, área y estrato se filtran en el navegador sobre lo cargado
// (D9, AC2.2.5), cargando solas las páginas restantes (AC2.2.6).

const API = '**/api/properties**';

const card = (n: number) => ({
  id: `p${n}`,
  codigo: `JF-${String(n).padStart(4, '0')}`,
  slug: `inmueble-${n}`,
  operacion: 'VENTA',
  tipo: 'CASA',
  titulo: { es: `Inmueble ${n}`, en: `Property ${n}` },
  precio: 300000000 + n,
  departamento: 'Antioquia',
  municipio: 'Medellín',
  dormitorios: (n % 4) + 1,
  banos: (n % 3) + 1,
  areaConstruida: 40 + n * 5,
  estrato: (n % 6) + 1,
  destacada: n <= 17,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const rango = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => card(desde + i));

// 12 destacadas + 5 destacadas en la segunda página (cursor c1) + 3 no destacadas = 20 inmuebles.
const PAGINA_1 = rango(1, 12);
const PAGINA_2 = rango(13, 17);
const NO_DESTACADAS = rango(18, 20);
const TODAS = rango(1, 20);

const cards = (page: Page) => page.locator('article:has(a[href*="/propiedad/"])');
const contador = (n: number) => `${n} ${n === 1 ? 'resultado' : 'resultados'}`;
const aplicar = (page: Page) => page.getByRole('button', { name: 'Aplicar', exact: true });
const consultaUrl = (page: Page) => new URL(page.url()).searchParams;

const elegir = async (page: Page, placeholder: string, opcion: string) => {
  await page.getByPlaceholder(placeholder, { exact: true }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
};

/** Una respuesta retenida: la petición espera a `espera` hasta que se llama a `liberar`. */
function compuerta() {
  let liberar!: () => void;
  const espera = new Promise<void>((resolver) => {
    liberar = resolver;
  });
  return { espera, liberar };
}

interface Compuertas {
  /** Retiene la segunda página de destacadas (cursor c1). */
  readonly c1?: Promise<void>;
  /** Retiene la consulta de no destacadas. */
  readonly noDestacadas?: Promise<void>;
}

async function simular(page: Page, compuertas: Compuertas = {}) {
  const { c1 = Promise.resolve(), noDestacadas = Promise.resolve() } = compuertas;
  const consultas: URLSearchParams[] = [];
  await page.route(API, async (route) => {
    const q = new URL(route.request().url()).searchParams;
    consultas.push(q);
    const cursor = q.get('cursor');
    let items: unknown[] = [];
    let nextCursor: string | null = null;
    if (q.get('destacada') === 'false') {
      await noDestacadas;
      items = NO_DESTACADAS;
    } else if (!cursor) {
      items = PAGINA_1;
      nextCursor = 'c1';
    } else if (cursor === 'c1') {
      await c1;
      items = PAGINA_2;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { items, nextCursor } }),
    });
  });
  return consultas;
}

test.describe('US2.2 | filtros de frontend sobre lo ya cargado', () => {
  test('AC2.2.6 | con un filtro activo se cargan solas las páginas restantes y el contador da el total filtrado', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(12);

    await elegir(page, 'Dormitorios mín.', '3+');
    await aplicar(page).click();

    // Solo se llega a ese total si se cargaron las tres tandas (12 + 5 + 3).
    const esperados = TODAS.filter((c) => c.dormitorios >= 3).length;
    await expect(cards(page)).toHaveCount(esperados);
    await expect(page.getByTestId('result-count')).toHaveText(contador(esperados));
    expect(consultaUrl(page).get('dormitorios')).toBe('3');
    expect(consultas.some((q) => q.get('destacada') === 'false')).toBe(true);
    // Los filtros de frontend nunca llegan al backend (D9).
    expect(consultas.some((q) => q.has('dormitorios'))).toBe(false);
  });

  test('AC2.2.5 | cambiar un filtro de frontend no pide nada a la API', async ({ page }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Dormitorios mín.', '3+');
    await aplicar(page).click();
    const con3 = TODAS.filter((c) => c.dormitorios >= 3).length;
    await expect(page.getByTestId('result-count')).toHaveText(contador(con3));

    const peticionesAntes = consultas.length;
    await elegir(page, 'Dormitorios mín.', '4+');
    await aplicar(page).click();
    const con4 = TODAS.filter((c) => c.dormitorios >= 4).length;
    await expect(page.getByTestId('result-count')).toHaveText(contador(con4));
    await expect(cards(page)).toHaveCount(con4);
    await page.waitForTimeout(500);
    expect(consultas.length).toBe(peticionesAntes);
  });

  test('los filtros se combinan: estrato exacto y área mínima', async ({ page }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Estrato', '3');
    await page.getByPlaceholder('Área mín. (m²)', { exact: true }).fill('100');
    await aplicar(page).click();

    const esperados = TODAS.filter((c) => c.estrato === 3 && c.areaConstruida >= 100).length;
    await expect(cards(page)).toHaveCount(esperados);
    await expect(page.getByTestId('result-count')).toHaveText(contador(esperados));
  });

  test('AC2.2.2 | recargar con el filtro en la URL reproduce el mismo resultado', async ({
    page,
  }) => {
    await simular(page);
    await page.goto('/es/venta?estrato=3', { waitUntil: 'networkidle' });

    const esperados = TODAS.filter((c) => c.estrato === 3).length;
    await expect(cards(page)).toHaveCount(esperados);
    await expect(page.getByTestId('result-count')).toHaveText(contador(esperados));
  });

  test('sin coincidencias no se declara vacío hasta haber cargado todas las páginas', async ({
    page,
  }) => {
    const retenida = compuerta();
    await simular(page, { c1: retenida.espera });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Dormitorios mín.', '5+'); // ningún inmueble tiene 5 o más
    await aplicar(page).click();

    // La primera página no trae coincidencias, pero faltan páginas: esqueletos, no «vacío».
    await expect(page.getByTestId('skeleton-card').first()).toBeVisible();
    await expect(page.getByText('No encontramos propiedades')).toHaveCount(0);

    retenida.liberar();
    await expect(page.getByText('No encontramos propiedades')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test('el contador no aparece hasta haber cargado todas las páginas', async ({ page }) => {
    const retenida = compuerta();
    await simular(page, { c1: retenida.espera });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Dormitorios mín.', '3+');
    await aplicar(page).click();

    // La primera página ya trae coincidencias, pero faltan páginas: un total parcial engañaría.
    await expect(cards(page).first()).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('result-count')).toHaveCount(0);

    retenida.liberar();
    const esperados = TODAS.filter((c) => c.dormitorios >= 3).length;
    await expect(page.getByTestId('result-count')).toHaveText(contador(esperados));
  });

  test('si las coincidencias están solo en las no destacadas, no se declara vacío mientras llegan', async ({
    page,
  }) => {
    const retenida = compuerta();
    await simular(page, { noDestacadas: retenida.espera });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    // Las destacadas (1 a 17) no llegan a 130 m²: solo cumplen las no destacadas (18 a 20).
    await page.getByPlaceholder('Área mín. (m²)', { exact: true }).fill('130');
    await aplicar(page).click();

    await expect(page.getByTestId('skeleton-card').first()).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.getByText('No encontramos propiedades')).toHaveCount(0);
    await expect(page.getByTestId('result-count')).toHaveCount(0);

    retenida.liberar();
    const esperados = TODAS.filter((c) => c.areaConstruida >= 130).length;
    await expect(cards(page)).toHaveCount(esperados);
    await expect(page.getByTestId('result-count')).toHaveText(contador(esperados));
  });
});

test.describe('US2.2 | filtros de frontend sin ir al servidor', () => {
  test('AC2.2.5 | cambiar un filtro de frontend no pide la página al servidor', async ({
    page,
  }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await elegir(page, 'Dormitorios mín.', '3+');
    await aplicar(page).click();
    const con3 = TODAS.filter((c) => c.dormitorios >= 3).length;
    await expect(page.getByTestId('result-count')).toHaveText(contador(con3));
    await page.waitForTimeout(500);

    const alServidor: string[] = [];
    page.on('request', (peticion) => {
      const cabeceras = peticion.headers();
      const url = new URL(peticion.url());
      if (cabeceras['rsc'] && !cabeceras['next-router-prefetch'] && url.pathname === '/es/venta') {
        alServidor.push(url.search);
      }
    });

    await elegir(page, 'Dormitorios mín.', '4+');
    await aplicar(page).click();
    const con4 = TODAS.filter((c) => c.dormitorios >= 4).length;
    await expect(page.getByTestId('result-count')).toHaveText(contador(con4));
    expect(consultaUrl(page).get('dormitorios')).toBe('4');
    await page.waitForTimeout(500);
    expect(alServidor).toEqual([]);
  });
});

function vigilarServidor(page: Page) {
  const peticiones: string[] = [];
  page.on('request', (peticion) => {
    const cabeceras = peticion.headers();
    const url = new URL(peticion.url());
    if (cabeceras['rsc'] && !cabeceras['next-router-prefetch'] && url.pathname === '/es/venta') {
      peticiones.push(url.search);
    }
  });
  return peticiones;
}

test.describe('US2.2 | la URL manda sin recargar desde el servidor', () => {
  test('AC2.2.2 | atrás y adelante cambian los resultados y el campo', async ({ page }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    const campo = page.getByPlaceholder('Dormitorios mín.', { exact: true });
    const total = (n: number) => contador(TODAS.filter((c) => c.dormitorios >= n).length);

    for (const n of [3, 4]) {
      await elegir(page, 'Dormitorios mín.', `${n}+`);
      await aplicar(page).click();
      await expect(page.getByTestId('result-count')).toHaveText(total(n));
    }

    await page.goBack();
    await expect(page.getByTestId('result-count')).toHaveText(total(3));
    await expect(campo).toHaveValue('3+');

    await page.goForward();
    await expect(page.getByTestId('result-count')).toHaveText(total(4));
    await expect(campo).toHaveValue('4+');
  });

  test('AC2.2.4 | un filtro de base de datos pide a la API, no la página al servidor', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    const alServidor = vigilarServidor(page);

    await elegir(page, 'Tipo de inmueble', 'Casa');
    await aplicar(page).click();

    await expect.poll(() => consultas.some((q) => q.get('tipo') === 'CASA')).toBe(true);
    await page.waitForTimeout(500);
    expect(alServidor).toEqual([]);
  });
});

test.describe('US2.2 | barra de progreso', () => {
  test('AC2.2.4 | al filtrar muestra la barra amarilla y atenúa las tarjetas anteriores', async ({
    page,
  }) => {
    await simular(page);
    const retenida = compuerta();
    await page.route(API, async (route) => {
      if (new URL(route.request().url()).searchParams.has('tipo')) await retenida.espera;
      await route.fallback();
    });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page).first()).toBeVisible();
    const barra = page.getByRole('progressbar', { includeHidden: true });
    const contenedor = barra.locator('..');
    await expect(contenedor).toHaveCSS('opacity', '0');

    await elegir(page, 'Tipo de inmueble', 'Casa');
    await aplicar(page).click();

    await expect(contenedor).toHaveCSS('opacity', '1');
    await expect(barra).toHaveCSS('background-color', 'rgb(249, 234, 27)');
    await expect(page.getByTestId('property-grid')).toHaveCSS('opacity', '0.5');

    retenida.liberar();
    await expect(contenedor).toHaveCSS('opacity', '0');
    await expect(page.getByTestId('property-grid')).toHaveCSS('opacity', '1');
    // Es decorativa: el estado de carga lo expone la rejilla con aria-busy.
    await expect(contenedor).toHaveAttribute('aria-hidden', 'true');
  });
});
