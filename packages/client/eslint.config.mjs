import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  // Prohibit hardcoded WhatsApp URLs outside the official helper and test files
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/whatsapp.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/wa\\.me|whatsapp\\.com/i]',
          message: 'Usa buildWhatsAppUrl de lib/whatsapp.ts',
        },
        {
          selector: 'TemplateElement[value.raw=/wa\\.me|whatsapp\\.com/i]',
          message: 'Usa buildWhatsAppUrl de lib/whatsapp.ts',
        },
      ],
    },
  },
]);

export default eslintConfig;
