import { defineConfig, devices } from '@playwright/test';

// Mobile-first: the default project emulates a 375x667 viewport (AC7.6.1).
// A desktop project is provided for wider-layout coverage.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // Gate 7 (sin emuladores) no puede servir catálogo ni fichas: los tests marcados
  // `@backend` se ejecutan en el gate 8 con `playwright.backend.config.ts`.
  grepInvert: /@backend/,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run start -- -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    env: {
      NEXT_PUBLIC_WHATSAPP_NUMBER: '573000000000',
    },
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
