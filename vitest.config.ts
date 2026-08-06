import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Suites needing a document opt in with `@vitest-environment happy-dom`.
    restoreMocks: true,
  },
});
