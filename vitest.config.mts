import { defineConfig } from 'vitest/config';
import path from 'node:path';

const here = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(here, './src'),
      // `server-only` throws on import outside a React Server Components graph, which is
      // exactly its job — and which would make every module that guards itself with it
      // untestable. Stubbing it here keeps the guard real in the app and inert under vitest.
      'server-only': path.resolve(here, './tests/stubs/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/content/**', 'src/i18n/**'],
      reporter: ['text-summary'],
    },
  },
});
