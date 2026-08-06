/**
 * Inline scripts that must run before first paint, kept here as strings.
 *
 * These use `is:inline`, which tells Astro to leave them completely alone —
 * including skipping them when it generates CSP hashes for the script-src
 * directive. So `astro.config.mjs` imports this module, hashes these exact
 * strings, and feeds the result to `security.csp.scriptDirective.hashes`.
 *
 * That is why they live in a shared module rather than inline in the markup:
 * the hash is derived from the same source the page embeds, so editing one of
 * these can never leave a stale hash behind and silently break the page.
 *
 * Both must stay free of build-time interpolation, or the hash stops being
 * stable. The redirect reads its target from the hreflang link already in the
 * document rather than having a path baked in.
 */

/** Applies the stored theme before first paint, so there is no flash. */
export const THEME_INIT = `(function(){var r=document.documentElement;try{var s=localStorage.getItem("theme");r.dataset.theme=s==="light"||s==="dark"?s:window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){r.dataset.theme="dark"}})();`;

/**
 * Honours an explicitly chosen locale on return visits to the English page.
 * Only fires when the visitor picked Spanish with the toggle — `navigator.language`
 * is deliberately never sniffed, because auto-redirecting on browser locale hides
 * one version from crawlers and strands anyone whose browser locale is not their
 * reading preference. The `!location.hash` guard keeps deep links intact.
 */
export const LOCALE_REDIRECT = `try{if(localStorage.getItem("lang")==="es"&&!location.hash){var l=document.querySelector('link[rel="alternate"][hreflang="es"]');if(l&&l.href)location.replace(l.href)}}catch(e){}`;
