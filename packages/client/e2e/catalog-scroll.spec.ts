import { expect, test, type Page, type Route } from '@playwright/test';

// Gate 7 (sin backend): /api/properties se simula en el navegador.
// El selector de tarjetas es el mismo de catalog-real.spec.ts.

const API = '**/api/properties**';
const PAGE_SIZE = 12;

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
  destacada: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const cards = (page: Page) => page.locator('article:has(a[href*="/propiedad/"])');
const lote = (desde: number, n: number) => Array.from({ length: n }, (_, i) => card(desde + i));

const ok = (items: unknown[], nextCursor: string | null = null) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true, data: { items, nextCursor } }),
});

const fallo = (route: Route) =>
  route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      data: { code: 'INTERNAL', details: null, requestId: 'x' },
      message: 'x',
    }),
  });

const hrefsDeTarjetas = (page: Page) =>
  cards(page).evaluateAll((els) =>
    els.map((el) => el.querySelector('a[href*="/propiedad/"]')?.getAttribute('href')),
  );

// Lleva el centinela al viewport: la carga se dispara sola (AC2.3.4). Evita hacer clic en
// «Cargar más», porque el propio desplazamiento del clic activa esa carga y compite con él.
const cargarMas = (page: Page) =>
  page.locator('[class*="loadMoreSentinel"]').scrollIntoViewIfNeeded();

/**
 * Simula el listado: primera página de 12 destacadas con cursor `c1`; la segunda la decide
 * `paginaDos`. La consulta de no destacadas (destacada=false) siempre vuelve vacía.
 */
async function simular(
  page: Page,
  paginaDos: (route: Route) => Promise<void> | void,
  cursores: (string | null)[] = [],
) {
  await page.route(API, async (route) => {
    const q = new URL(route.request().url()).searchParams;
    const cursor = q.get('cursor');
    cursores.push(cursor);
    if (q.get('destacada') === 'false') return route.fulfill(ok([]));
    if (!cursor) return route.fulfill(ok(lote(1, PAGE_SIZE), 'c1'));
    return paginaDos(route);
  });
  return cursores;
}

test.describe('US2.2 / US2.3 | catálogo: filtros y scroll infinito', () => {
  test('US2.2 | marcar «Casa» y aplicar vuelve a consultar con tipo=CASA, sin recargar', async ({
    page,
  }) => {
    const consultas: URLSearchParams[] = [];
    await page.route(API, async (route) => {
      const q = new URL(route.request().url()).searchParams;
      consultas.push(q);
      await route.fulfill(ok(q.get('tipo') ? lote(1, 2) : lote(1, 3)));
    });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(3);
    await page.getByPlaceholder('Tipo de inmueble', { exact: true }).click();
    await page.getByRole('option', { name: 'Casa', exact: true }).click();
    await page.getByRole('button', { name: 'Aplicar', exact: true }).click();
    await expect
      .poll(() => consultas.some((q) => q.get('tipo') === 'CASA'), { timeout: 5000 })
      .toBe(true);
    await expect(cards(page)).toHaveCount(2);
  });

  test('AC2.3.1 | con más de 12 se ven 12 y «Cargar más» añade los siguientes, sin duplicados', async ({
    page,
  }) => {
    await simular(page, (route) => route.fulfill(ok(lote(PAGE_SIZE + 1, PAGE_SIZE))));
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await cargarMas(page);
    await expect(cards(page)).toHaveCount(PAGE_SIZE * 2);
    const hrefs = await hrefsDeTarjetas(page);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test('AC2.3.2 | con 12 o menos no hay petición con cursor ni control de carga', async ({
    page,
  }) => {
    const cursores: (string | null)[] = [];
    await page.route(API, async (route) => {
      const q = new URL(route.request().url()).searchParams;
      cursores.push(q.get('cursor'));
      await route.fulfill(q.get('destacada') === 'false' ? ok([]) : ok(lote(1, 5)));
    });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Cargar más' })).toHaveCount(0);
    expect(cursores.filter((c) => c !== null)).toHaveLength(0);
  });

  test('AC2.3.3 | mientras llega la página siguiente hay tarjetas Skeleton y ningún spinner', async ({
    page,
  }) => {
    let liberar!: () => void;
    const espera = new Promise<void>((resolver) => {
      liberar = resolver;
    });
    await simular(page, async (route) => {
      await espera;
      await route.fulfill(ok(lote(PAGE_SIZE + 1, 3)));
    });
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await cargarMas(page);
    await expect(page.getByTestId('skeleton-card').first()).toBeVisible();
    // getByRole ignora lo marcado aria-hidden (la barra de AC2.2.4, siempre en el DOM).
    const spinners = page.locator('[class*="spinner" i], .mantine-Loader-root');
    await expect(spinners.or(page.getByRole('progressbar'))).toHaveCount(0);
    // «Cargar más» no activa la barra de progreso.
    const barra = page.getByRole('progressbar', { includeHidden: true });
    await expect(barra.locator('..')).toHaveCSS('opacity', '0');
    liberar();
    await expect(cards(page)).toHaveCount(PAGE_SIZE + 3);
    await expect(page.getByTestId('skeleton-card')).toHaveCount(0);
  });

  test('AC2.3.5 / AC2.3.8 | al agotarse sale «Fin de la lista», sin paginación numerada ni ?page=', async ({
    page,
  }) => {
    await simular(page, (route) => route.fulfill(ok(lote(PAGE_SIZE + 1, 3))));
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await cargarMas(page);
    await expect(cards(page)).toHaveCount(PAGE_SIZE + 3);
    await expect(page.getByText('Fin de la lista')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cargar más' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: /paginaci[oó]n|pagination/i })).toHaveCount(
      0,
    );
    expect(new URL(page.url()).searchParams.has('page')).toBe(false);
    await page.locator('footer').scrollIntoViewIfNeeded();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('AC2.3.7 | error en la página siguiente: conserva lo cargado y ofrece Reintentar', async ({
    page,
  }) => {
    let fallar = true;
    // El anunciador de rutas de Next también usa role=alert: se filtra por el texto del aviso.
    const aviso = page.getByRole('alert').filter({
      hasText: 'No se pudieron cargar más propiedades',
    });
    const cursores: (string | null)[] = [];
    await simular(
      page,
      (route) => (fallar ? fallo(route) : route.fulfill(ok(lote(PAGE_SIZE + 1, 3)))),
      cursores,
    );
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(cards(page)).toHaveCount(PAGE_SIZE);
    await cargarMas(page);

    // Bloque de error dentro de la lista, con lo ya cargado intacto.
    await expect(aviso).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();
    await expect(cards(page)).toHaveCount(PAGE_SIZE);

    // El scroll no reintenta solo mientras el error siga ahí.
    const antes = cursores.filter((c) => c === 'c1').length;
    await page.waitForTimeout(1000);
    expect(cursores.filter((c) => c === 'c1').length).toBe(antes);

    fallar = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(cards(page)).toHaveCount(PAGE_SIZE + 3);
    await expect(aviso).toHaveCount(0);
  });
});
