/// <reference types="vitest/config" />
// The reference above is what teaches Vite's UserConfig about `test`;
// getViteConfig is typed against plain Vite config and rejects it otherwise.
import { getViteConfig } from 'astro/config';

/*
 * getViteConfig rather than a bare defineConfig: it loads the project's Astro
 * config and plugins, which is what lets the component suite import and render
 * `.astro` files through the container API.
 */
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Suites needing a document opt in with `@vitest-environment happy-dom`.
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      // Astro compiles .astro to JS with generated wrappers, so line coverage
      // there measures the compiler more than the component. The meaningful
      // number is over the logic modules; components are covered by asserting
      // their rendered output instead.
      include: ['src/lib/**', 'src/i18n/**'],
      reporter: ['text-summary', 'html'],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
