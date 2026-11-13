import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Gate 8: mismos proyectos y webServer que el gate 7, pero solo los tests que
// necesitan emuladores + seed (tag `@backend`). `grepInvert: []` anula el filtro
// inverso heredado del config base.
const backendConfig: PlaywrightTestConfig = {
  ...baseConfig,
  grep: /@backend/,
  grepInvert: [],
};

export default defineConfig(backendConfig);
