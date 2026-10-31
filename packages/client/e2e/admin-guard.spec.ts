/**
 * US1.5 AC1.5.1 - E2E: guard /admin redirige al login sin sesión
 * Playwright - verificación de guard de protección
 */
import { test, expect } from '@playwright/test';

test('/es/admin redirige a /es/admin/login sin cookie __session', async ({ page }) => {
  // AC1.5.1: sin sesion, debe redirigir al login
  await page.goto('/es/admin');
  // Verifica redirección (puede ser /es/admin/login o 302 implícito)
  await expect(page).toHaveURL(/\/es\/admin\/login/, { timeout: 5000 });
});
