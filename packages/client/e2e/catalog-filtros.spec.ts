import { expect, test, type Page } from '@playwright/test';

// Gate 7 (sin backend): /api/properties se simula en el navegador.
// US2.2: la URL es la única fuente de verdad (AC2.2.2) y las combinaciones que el backend
// rechazaría no llegan a pedirse (AC2.2.3).

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
  destacada: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

async function simular(page: Page): Promise<URLSearchParams[]> {
  const consultas: URLSearchParams[] = [];
  await page.route(API, async (route) => {
    consultas.push(new URL(route.request().url()).searchParams);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { items: [card(1), card(2), card(3)], nextCursor: null },
      }),
    });
  });
  return consultas;
}

const elegir = async (page: Page, placeholder: string, opcion: string) => {
  await page.getByPlaceholder(placeholder, { exact: true }).click();
  await page.getByRole('option', { name: opcion, exact: true }).click();
};
const aplicar = (page: Page) => page.getByRole('button', { name: 'Aplicar', exact: true });
const consultaUrl = (page: Page) => new URL(page.url()).searchParams;

test.describe('US2.2 | filtros del catálogo: URL y combinaciones válidas', () => {
  test('AC2.2.2 | un filtro de base de datos y uno de frontend viajan en la URL; solo el primero pide', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Tipo de inmueble', 'Casa');
    await elegir(page, 'Dormitorios mín.', '2+');
    await aplicar(page).click();

    await expect.poll(() => consultaUrl(page).get('tipo'), { timeout: 8000 }).toBe('CASA');
    expect(consultaUrl(page).get('dormitorios')).toBe('2');
    await expect
      .poll(() => consultas.some((q) => q.get('tipo') === 'CASA'), { timeout: 8000 })
      .toBe(true);
    // Los filtros de frontend nunca llegan al backend (D9).
    expect(consultas.some((q) => q.has('dormitorios'))).toBe(false);
  });

  test('D28 | tipo es un selector de un solo valor y no hay «Solo destacadas»', async ({
    page,
  }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await expect(page.getByText('Solo destacadas')).toHaveCount(0);
    await page.getByPlaceholder('Tipo de inmueble', { exact: true }).click();
    await expect(page.getByRole('option')).toHaveCount(8);
  });

  test('AC2.2.2 | departamento y municipio viajan juntos en la URL y en la petición', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Departamento', 'Antioquia');
    await elegir(page, 'Municipio', 'Medellín');
    await aplicar(page).click();

    await expect.poll(() => consultaUrl(page).get('municipio'), { timeout: 8000 }).toBe('Medellín');
    expect(consultaUrl(page).get('departamento')).toBe('Antioquia');
    await expect
      .poll(
        () =>
          consultas.some(
            (q) => q.get('departamento') === 'Antioquia' && q.get('municipio') === 'Medellín',
          ),
        { timeout: 8000 },
      )
      .toBe(true);
  });

  test('AC2.2.3 | departamento sin municipio: avisa, deshabilita «Aplicar» y no pide', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    const antes = consultas.length;

    await elegir(page, 'Departamento', 'Antioquia');
    await expect(page.getByText('Elige también el municipio.')).toBeVisible();
    await expect(aplicar(page)).toBeDisabled();
    await page.waitForTimeout(500);
    expect(consultas.length).toBe(antes);
    expect(new URL(page.url()).search).toBe('');
  });

  test('AC2.2.2 | el rango de precio viaja en la URL y en la petición', async ({ page }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await page.getByPlaceholder('Mín', { exact: true }).fill('100000000');
    await page.getByPlaceholder('Máx', { exact: true }).fill('500000000');
    await aplicar(page).click();

    await expect
      .poll(() => consultaUrl(page).get('precioMax'), { timeout: 8000 })
      .toBe('500000000');
    expect(consultaUrl(page).get('precioMin')).toBe('100000000');
    await expect
      .poll(
        () =>
          consultas.some(
            (q) => q.get('precioMin') === '100000000' && q.get('precioMax') === '500000000',
          ),
        { timeout: 8000 },
      )
      .toBe(true);
  });

  test('AC2.2.2 | baños, área y estrato viajan en la URL y no provocan una petición', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Baños mín.', '2+');
    await page.getByPlaceholder('Área mín. (m²)', { exact: true }).fill('80');
    await elegir(page, 'Estrato', '3');
    await aplicar(page).click();

    await expect.poll(() => consultaUrl(page).get('estrato'), { timeout: 8000 }).toBe('3');
    expect(consultaUrl(page).get('banos')).toBe('2');
    expect(consultaUrl(page).get('areaMin')).toBe('80');
    expect(consultas.some((q) => q.has('banos') || q.has('areaMin') || q.has('estrato'))).toBe(
      false,
    );
  });

  test('US2.2 | «Limpiar» deja la URL sin filtros y vacía los controles', async ({ page }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });

    await elegir(page, 'Dormitorios mín.', '2+');
    await aplicar(page).click();
    await expect.poll(() => consultaUrl(page).get('dormitorios'), { timeout: 8000 }).toBe('2');

    await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    await expect.poll(() => new URL(page.url()).search, { timeout: 8000 }).toBe('');
    await expect(page.getByPlaceholder('Dormitorios mín.', { exact: true })).toHaveValue('');
  });

  test('AC2.2.3 | precio mínimo mayor que el máximo: avisa y deshabilita «Aplicar»', async ({
    page,
  }) => {
    await simular(page);
    await page.goto('/es/venta', { waitUntil: 'networkidle' });
    await page.getByPlaceholder('Mín', { exact: true }).fill('900000000');
    await page.getByPlaceholder('Máx', { exact: true }).fill('100000');
    await expect(
      page.getByText('El precio mínimo no puede ser mayor que el máximo.'),
    ).toBeVisible();
    await expect(aplicar(page)).toBeDisabled();
  });

  test('AC2.2.3 | una URL escrita a mano con combinaciones inválidas no llega al backend', async ({
    page,
  }) => {
    const consultas = await simular(page);
    await page.goto(
      '/es/venta?departamento=Antioquia&precioMin=900&precioMax=100&tipo=CASA,FINCA',
      {
        waitUntil: 'networkidle',
      },
    );
    await expect.poll(() => consultas.length, { timeout: 8000 }).toBeGreaterThan(0);
    for (const q of consultas) {
      expect(q.has('departamento')).toBe(false);
      expect(q.has('precioMin')).toBe(false);
      expect(q.has('precioMax')).toBe(false);
      expect(q.get('tipo')).toBe('CASA');
    }
  });
});
