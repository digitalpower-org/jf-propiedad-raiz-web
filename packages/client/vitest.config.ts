import { defineConfig } from 'vitest/config';

// Node-environment unit tests for pure logic under src/lib/**, src/i18n/** and
// src/server/** (matcher del Proxy; los route handlers no son puros).
// E2E (Playwright) is intentionally NOT part of this config or the gates.
export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/lib/**/*.{test,spec}.ts',
      'src/i18n/**/*.{test,spec}.ts',
      'src/server/**/*.{test,spec}.ts',
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: [
        'src/lib/**/*.ts',
        'src/i18n/config.ts',
        'src/i18n/routes.ts',
        'src/i18n/negotiate.ts',
        'src/server/match-route.ts',
      ],
      exclude: [
        'src/lib/**/*.{test,spec}.ts',
        'src/i18n/**/*.{test,spec}.ts',
        'src/server/**/*.{test,spec}.ts',
      ],
    },
  },
});
