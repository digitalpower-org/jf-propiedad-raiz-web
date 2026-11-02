# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages/client/e2e/admin-guard.spec.ts >> /es/admin redirige a /es/admin/login sin cookie __session
- Location: packages/client/e2e/admin-guard.spec.ts:7:5

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/es/admin", waiting until "load"

```

# Test source

```ts
  1  | /**
  2  |  * US1.5 AC1.5.1 - E2E: guard /admin redirige al login sin sesión
  3  |  * Playwright - verificación de guard de protección
  4  |  */
  5  | import { test, expect } from '@playwright/test';
  6  | 
  7  | test('/es/admin redirige a /es/admin/login sin cookie __session', async ({ page }) => {
  8  |   // AC1.5.1: sin sesion, debe redirigir al login
> 9  |   await page.goto('/es/admin');
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  10 |   // Verifica redirección (puede ser /es/admin/login o 302 implícito)
  11 |   await expect(page).toHaveURL(/\/es\/admin\/login/, { timeout: 5000 });
  12 | });
  13 | 
```