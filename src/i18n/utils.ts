import { defaultLang, ui, type Lang, type UiKey } from './ui';

/**
 * Resolve the locale from a URL. `/es/...` is Spanish; everything else is the
 * default locale. Works with or without a configured `base`.
 */
export function getLangFromUrl(url: URL): Lang {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = url.pathname.startsWith(base) ? url.pathname.slice(base.length) : url.pathname;
  const [, segment] = path.split('/');
  return segment === 'es' ? 'es' : defaultLang;
}

/** Returns a `t(key)` bound to one locale. Missing keys fall back to English. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** The other locale — there are exactly two, so this is a toggle. */
export function otherLang(lang: Lang): Lang {
  return lang === 'en' ? 'es' : 'en';
}

/**
 * Prefix a site-root-relative path with the configured `base`.
 * Every internal href and asset URL goes through this, so switching between a
 * subpath deploy and a custom domain is a config-only change.
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

/** Root-relative URL of a page in the given locale. */
export function localizedPath(lang: Lang): string {
  return lang === defaultLang ? withBase('/') : withBase(`/${lang}/`);
}

/** Absolute URL, for canonical links, hreflang alternates and OG tags. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(withBase(path), site ?? 'https://sherrerapiqueras.github.io').href;
}
