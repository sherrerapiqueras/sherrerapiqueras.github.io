// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Moving to a custom domain later is a two-line change here: set `site` to the
// domain, drop `base`, and add a `public/CNAME`. Every internal URL in the app
// goes through `withBase()` in src/lib/paths.ts, so nothing else needs touching.
export default defineConfig({
  site: 'https://sherrerapiqueras.github.io',
  base: '/',
  trailingSlash: 'ignore',
  build: {
    // Emit `/es/index.html` rather than `/es.html`, so the deployed URLs match
    // the hreflang alternates exactly.
    format: 'directory',
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      // `/` serves English; `/es/` serves Spanish. No redirect on the root.
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es-ES' },
      },
    }),
  ],
});
