// @ts-check
import { createHash } from 'node:crypto';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { LOCALE_REDIRECT, THEME_INIT } from './src/lib/inline-scripts.js';

/**
 * Astro hashes the scripts it bundles, but `is:inline` scripts are left
 * untouched — including by the CSP pass — so their hashes must be supplied.
 * Deriving them from the same exported strings the page embeds means an edit
 * to either script cannot leave a stale hash behind.
 */
/**
 * @param {string} source
 * @returns {`sha256-${string}`} the literal form Astro's CspHash type requires
 */
const sha256 = (source) => `sha256-${createHash('sha256').update(source, 'utf8').digest('base64')}`;

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
  /*
   * GitHub Pages serves static files and cannot set response headers, so a
   * <meta> CSP is the only option here. Astro emits it with sha256 hashes for
   * every inline script and style it generates, which is strictly better than
   * the 'unsafe-inline' a hand-written policy would need.
   *
   * Known limits of the meta form: `frame-ancestors` is ignored there, so
   * clickjacking cannot be blocked this way — it is omitted rather than listed
   * and silently ineffective. `default-src 'none'` refuses anything not below.
   */
  security: {
    csp: {
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        // data: is required — Astro inlines small font subsets as data URIs.
        "font-src 'self' data:",
        // The only external request the site makes: the release refresh.
        "connect-src 'self' https://api.github.com",
        "base-uri 'none'",
        "form-action 'none'",
      ],
      scriptDirective: {
        hashes: [sha256(THEME_INIT), sha256(LOCALE_REDIRECT)],
      },
    },
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
