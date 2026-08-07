import { describe, expect, it } from 'vitest';
import { defaultLang, languages, shared, ui, type Lang, type UiKey } from '../src/i18n/ui';
import {
  absoluteUrl,
  getLangFromUrl,
  localizedPath,
  otherLang,
  useTranslations,
  withBase,
} from '../src/i18n/utils';

const locales = Object.keys(languages) as Lang[];

describe('translation completeness', () => {
  it('has the same keys in every locale', () => {
    const base = Object.keys(ui[defaultLang]).sort();
    for (const lang of locales) {
      const keys = Object.keys(ui[lang]).sort();
      const missing = base.filter((k) => !keys.includes(k));
      const extra = keys.filter((k) => !base.includes(k));
      expect({ lang, missing, extra }).toEqual({ lang, missing: [], extra: [] });
    }
  });

  it('has no empty or placeholder values', () => {
    for (const lang of locales) {
      for (const [key, value] of Object.entries(ui[lang])) {
        expect(typeof value, `${lang}.${key}`).toBe('string');
        expect(value.trim(), `${lang}.${key} is empty`).not.toBe('');
        expect(value, `${lang}.${key} looks like a placeholder`).not.toMatch(/^(TODO|TBD|FIXME)/i);
      }
    }
  });

  it('translates the strings that must differ between locales', () => {
    // A Spanish value identical to English usually means a forgotten translation.
    const mustDiffer: UiKey[] = [
      'meta.title',
      'meta.description',
      'hero.pitch',
      'boot.4',
      'projects.heading',
      'projects.note',
      'contact.heading',
      'stack.shipped',
      'footer.repo',
    ];
    for (const key of mustDiffer) {
      expect(ui.es[key], `es.${key} was never translated`).not.toBe(ui.en[key]);
    }
  });

  it('keeps each nav label matching the section heading it points at', () => {
    /*
     * The Spanish nav once read "/contactos" while the heading below said
     * "CONTACTO". Both are defensible in isolation; together they read as a
     * mistake. This pins them to each other in every locale.
     */
    const pairs: Array<[UiKey, UiKey]> = [
      ['nav.projects', 'projects.heading'],
      ['nav.stack', 'stack.heading'],
      ['nav.contact', 'contact.heading'],
    ];

    for (const lang of locales) {
      for (const [navKey, headingKey] of pairs) {
        const navWord = ui[lang][navKey].replace(/^\//, '').toLocaleUpperCase(lang);
        expect(navWord, `${lang}: ${navKey} vs ${headingKey}`).toBe(ui[lang][headingKey]);
      }
    }
  });

  it('points each locale at its own CV', () => {
    expect(ui.en['hero.cvFile']).toContain('_en');
    expect(ui.es['hero.cvFile']).toContain('_es');
    expect(ui.en['hero.cvFile']).not.toBe(ui.es['hero.cvFile']);
  });
});

describe('useTranslations', () => {
  it('returns the value for the requested locale', () => {
    expect(useTranslations('es')('projects.heading')).toBe('PROYECTOS');
  });

  it('falls back to the default locale rather than rendering a raw key', () => {
    const t = useTranslations('es');
    // @ts-expect-error deliberately unknown key
    expect(t('does.not.exist')).toBeUndefined();
  });
});

describe('getLangFromUrl', () => {
  const cases: Array<[string, Lang]> = [
    ['https://example.com/', 'en'],
    ['https://example.com/index.html', 'en'],
    ['https://example.com/es/', 'es'],
    ['https://example.com/es', 'es'],
    ['https://example.com/es/index.html', 'es'],
    // Prefix traps: these must not be detected as Spanish.
    ['https://example.com/esoteric/', 'en'],
    ['https://example.com/espanol/', 'en'],
    ['https://example.com/assets/es/', 'en'],
  ];

  for (const [url, expected] of cases) {
    it(`${url} -> ${expected}`, () => {
      expect(getLangFromUrl(new URL(url))).toBe(expected);
    });
  }
});

describe('paths', () => {
  it('withBase produces root-relative single-slash paths', () => {
    expect(withBase('/og.png')).toBe('/og.png');
    expect(withBase('og.png')).toBe('/og.png');
    expect(withBase('/')).toBe('/');
  });

  it('localizedPath maps each locale to its route', () => {
    expect(localizedPath('en')).toBe('/');
    expect(localizedPath('es')).toBe('/es/');
  });

  it('otherLang is a two-way toggle', () => {
    expect(otherLang('en')).toBe('es');
    expect(otherLang('es')).toBe('en');
  });

  it('absoluteUrl builds canonical URLs against the site origin', () => {
    const site = new URL('https://sherrerapiqueras.github.io');
    expect(absoluteUrl('/', site)).toBe('https://sherrerapiqueras.github.io/');
    expect(absoluteUrl('/es/', site)).toBe('https://sherrerapiqueras.github.io/es/');
    expect(absoluteUrl('/og.png', site)).toBe('https://sherrerapiqueras.github.io/og.png');
  });

  it('absoluteUrl never emits a double slash', () => {
    const site = new URL('https://sherrerapiqueras.github.io');
    for (const p of ['/', '/es/', 'og.png', '/assets/cv.pdf']) {
      expect(absoluteUrl(p, site)).not.toMatch(/[^:]\/\//);
    }
  });
});

describe('shared content', () => {
  it('uses https for every external link', () => {
    for (const url of [shared.linkedin, shared.github, shared.repo]) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });

  it('has a plausible contact email', () => {
    expect(shared.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  });

  it('exposes four nav entries whose anchors match the section ids', () => {
    expect(shared.nav).toHaveLength(4);
    expect(shared.nav.map((n) => n.href)).toEqual(['#index', '#projects', '#stack', '#contact']);
  });

  it('carries no phone number anywhere in site copy', () => {
    // The design is explicit that no phone number appears on the site.
    const blob = JSON.stringify({ ui, shared });
    expect(blob).not.toMatch(/\+\d{2}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/);
    expect(blob).not.toMatch(/\btel:/);
  });
});
