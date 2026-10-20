import { defineConfig } from 'vitest/config';

// Node-environment unit tests for pure logic under src/lib/**.
// E2E (Playwright) is intentionally NOT part of this config or the gates.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.{test,spec}.ts'],
    },
  },
});
