import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * PLACEHOLDER E2E SPEC — NOT part of the CI gates.
 *
 * This file exists only to prove the Playwright + axe toolchain is wired up.
 * It is skipped by default (`test.skip`) so it never runs during `npm run test`
 * (which delegates to Vitest) nor during any root gate. Remove/replace it when
 * the real critical-flow E2E suite lands (see docs/QA.md).
 *
 * Run manually with: npm run test:e2e -w @jf/client
 */
test.describe('toolchain placeholder (skipped)', () => {
  test.skip('home page renders and has no critical a11y violations', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.*/);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
