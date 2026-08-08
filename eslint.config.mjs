import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  globalIgnores([
    // eslint-config-next defaults, restated because declaring globalIgnores replaces them
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',

    // Not application code — bundled Claude skill tooling, source media, generated output.
    // The skills ship their own .cjs scripts; they are vendored and must not be linted or edited.
    '.claude/**',
    'assets/**',
    'public/media/**',
    'docs/**',
    'drizzle/**',
    'playwright-report/**',
    'test-results/**',
    'coverage/**',
  ]),

  ...nextVitals,
  ...nextTs,

  {
    rules: {
      // Surfacing unused symbols matters here because content modules are large and typed;
      // an unused export usually means a content key was renamed and something was missed.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]);

export default eslintConfig;
