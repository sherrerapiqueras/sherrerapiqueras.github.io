import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import Contact from '../src/components/Contact.astro';
import Header from '../src/components/Header.astro';
import Hero from '../src/components/Hero.astro';
import Marquee from '../src/components/Marquee.astro';
import ProjectCard from '../src/components/ProjectCard.astro';
import Stack from '../src/components/Stack.astro';
import StatBand from '../src/components/StatBand.astro';
import { PROJECTS } from '../src/lib/projects';
import { shared, ui } from '../src/i18n/ui';

/**
 * Renders each component to HTML and asserts the output.
 *
 * The unit suites cover the logic; these cover the layer between that logic and
 * what a visitor actually receives — the accessibility attributes, the hrefs,
 * the per-locale wiring. All of it was previously verified only by eye in a
 * browser, which does not survive a refactor.
 */

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

/**
 * Strip tags and decode entities, so assertions read like the visible text.
 * Decoding matters: Astro escapes correctly, so "CLOUD & DEVOPS" arrives as
 * "CLOUD &amp; DEVOPS" and a naive tag-strip would fail on well-formed output.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, ' ')
    .trim();

const project = { ...PROJECTS[0], data: { ...PROJECTS[0].fallback, live: false } };

describe('Header', () => {
  it('renders the four nav entries with their anchors', async () => {
    const html = await container.renderToString(Header, { props: { lang: 'en' } });
    for (const item of shared.nav) {
      expect(html).toContain(`href="${item.href}"`);
      expect(text(html)).toContain(ui.en[item.labelKey]);
    }
  });

  it('translates the nav labels but never the anchors', async () => {
    const es = await container.renderToString(Header, { props: { lang: 'es' } });
    const body = text(es);
    expect(body).toContain('/índice');
    expect(body).toContain('/proyectos');
    expect(body).toContain('/contacto');
    expect(body).toContain('/stack'); // identical in both locales

    // English labels must not leak, and the ids must be untouched — translating
    // the visible label can never be allowed to break a link.
    expect(body).not.toContain('/projects');
    expect(body).not.toContain('/index');
    for (const item of shared.nav) {
      expect(es).toContain(`href="${item.href}"`);
    }
  });

  it('marks the current locale as the selected half of the toggle', async () => {
    // Regression: this was inverted, so the English page highlighted "ES" and
    // looked like Spanish was already active.
    const en = await container.renderToString(Header, { props: { lang: 'en' } });
    const es = await container.renderToString(Header, { props: { lang: 'es' } });

    const activeLabel = (html: string) => {
      const toggle = html.match(/id="lang-toggle"[\s\S]*?<\/a>/)![0];
      return toggle.match(/class="[^"]*active[^"]*"[^>]*>([^<]+)</)![1];
    };

    expect(activeLabel(en)).toBe('EN');
    expect(activeLabel(es)).toBe('ES');
  });

  it('gives both toggles an accessible name', async () => {
    const html = await container.renderToString(Header, { props: { lang: 'en' } });
    // The theme button's visible label names the current theme, so its
    // accessible name has to name the action instead.
    expect(html).toMatch(/id="theme-toggle"[\s\S]*?aria-label="[^"]+"/);
    expect(html).toContain(`aria-label="${ui.en['a11y.langToggle']}"`);
  });

  it('links the language toggle at the other locale', async () => {
    const en = await container.renderToString(Header, { props: { lang: 'en' } });
    const es = await container.renderToString(Header, { props: { lang: 'es' } });
    expect(en).toMatch(/id="lang-toggle"[^>]*href="\/es\/"/);
    expect(es).toMatch(/id="lang-toggle"[^>]*href="\/"/);
    // hreflang tells assistive tech the target language differs from the page.
    expect(en).toMatch(/id="lang-toggle"[^>]*hreflang="es"/);
  });

  it('labels the nav landmark', async () => {
    const html = await container.renderToString(Header, { props: { lang: 'es' } });
    expect(html).toContain(`aria-label="${ui.es['a11y.mainNav']}"`);
  });
});

describe('Hero', () => {
  it('renders the boot sequence for the requested locale', async () => {
    const html = await container.renderToString(Hero, { props: { lang: 'es' } });
    const body = text(html);
    for (const key of ['boot.1', 'boot.2', 'boot.3', 'boot.4'] as const) {
      expect(body).toContain(ui.es[key]);
    }
  });

  it('points the CV button at the matching locale file and downloads it', async () => {
    const en = await container.renderToString(Hero, { props: { lang: 'en' } });
    const es = await container.renderToString(Hero, { props: { lang: 'es' } });
    expect(en).toContain(`href="/assets/${ui.en['hero.cvFile']}"`);
    expect(es).toContain(`href="/assets/${ui.es['hero.cvFile']}"`);
    expect(en).toContain('download');
    // The visible label is a stylised filename, so the language must be in the
    // accessible name.
    expect(en).toContain(`aria-label="${ui.en['hero.ctaSecondaryLabel']}"`);
  });

  it('sends the primary CTA to the contact section', async () => {
    const html = await container.renderToString(Hero, { props: { lang: 'en' } });
    expect(html).toMatch(/class="cta-primary[^"]*"\s+href="#contact"/);
  });

  it('hides the decorative caret from assistive tech', async () => {
    const html = await container.renderToString(Hero, { props: { lang: 'en' } });
    expect(html).toMatch(/class="caret[^"]*"[^>]*aria-hidden="true"/);
  });

  it('renders the name as a single h1', async () => {
    const html = await container.renderToString(Hero, { props: { lang: 'en' } });
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(text(html)).toContain(shared.displayName[0]);
    expect(text(html)).toContain(shared.displayName[1]);
  });
});

describe('StatBand', () => {
  it('renders all three stats in the requested locale', async () => {
    const html = await container.renderToString(StatBand, { props: { lang: 'es' } });
    const body = text(html);
    for (const key of ['stats.1', 'stats.2', 'stats.3'] as const) {
      expect(body).toContain(ui.es[key]);
    }
  });
});

describe('Marquee', () => {
  it('is hidden from assistive tech and repeats the list twice', async () => {
    const html = await container.renderToString(Marquee, { props: {} });
    expect(html).toMatch(/class="ticker[^"]*"[^>]*aria-hidden="true"/);
    // Duplicated so the CSS translate loops seamlessly.
    const occurrences = html.split('JETPACK COMPOSE').length - 1;
    expect(occurrences).toBe(2);
  });
});

describe('ProjectCard', () => {
  let html: string;

  beforeEach(async () => {
    html = await container.renderToString(ProjectCard, { props: { project, lang: 'en' } });
  });

  it('renders the title, version and status', () => {
    const body = text(html);
    expect(body).toContain(project.name);
    expect(body).toContain(`v${project.data.version}`);
    expect(body).toContain(ui.en['projects.status.active']);
  });

  it('exposes the fields the client refresh targets', () => {
    for (const field of ['version', 'lastShip', 'releaseCount']) {
      expect(html).toContain(`data-field="${field}"`);
    }
    expect(html).toContain(`data-project="${project.slug}"`);
    expect(html).toContain('data-release-log');
  });

  it('renders every tech chip', () => {
    const body = text(html);
    for (const chip of project.tech) expect(body).toContain(chip);
  });

  it('renders one row per fallback release, with machine-readable dates', () => {
    const rows = html.match(/<li[^>]*>[\s\S]*?<\/li>/g) ?? [];
    expect(rows.length).toBeGreaterThanOrEqual(project.data.releases.length);
    for (const release of project.data.releases) {
      expect(html).toContain(`datetime="${release.date}"`);
      expect(text(html)).toContain(release.tag);
    }
  });

  it('renders the Play Store item as disabled, unfocusable and hrefless', () => {
    // The handoff is explicit: no hover change, not focusable, aria-disabled.
    const chip = html.match(/<span[^>]*class="link disabled"[\s\S]*?<\/span>\s*<\/span>/)?.[0];
    expect(chip, 'disabled play store chip should be a <span>').toBeTruthy();
    expect(chip).toContain('aria-disabled="true"');
    expect(chip).not.toContain('href');
    expect(chip).not.toContain('tabindex');
    expect(text(chip!)).toContain(ui.en['projects.soon']);
  });

  it('marks external links rel=noopener', () => {
    for (const url of [project.links.github, project.links.changelog]) {
      expect(html).toMatch(
        new RegExp(`href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*rel="noopener"`),
      );
    }
  });

  it('uses locale-appropriate screenshot alt text', async () => {
    const es = await container.renderToString(ProjectCard, { props: { project, lang: 'es' } });
    expect(html).toContain(ui.en['tempo.shotDark']);
    expect(es).toContain(ui.es['tempo.shotDark']);
  });

  it('lazy-loads the second screenshot only', () => {
    expect(html).toContain('loading="eager"');
    expect(html).toContain('loading="lazy"');
  });

  it('serves modern image formats', () => {
    expect(html).toMatch(/type="image\/avif"/);
    expect(html).toMatch(/type="image\/webp"/);
  });
});

describe('Stack', () => {
  it('renders every block and its two lines', async () => {
    const html = await container.renderToString(Stack, { props: { lang: 'en' } });
    const body = text(html);
    for (const block of shared.stack) {
      expect(body).toContain(block.label);
      for (const line of block.lines) expect(body).toContain(line);
    }
  });

  it('renders every employer with its years', async () => {
    const html = await container.renderToString(Stack, { props: { lang: 'en' } });
    const body = text(html);
    for (const e of shared.employers) {
      expect(body).toContain(e.name);
      expect(body).toContain(e.years);
    }
  });

  it('explains the current-role marker to screen readers', async () => {
    const html = await container.renderToString(Stack, { props: { lang: 'en' } });
    // The magenta dot is decorative; the meaning has to be in text somewhere.
    expect(html).toMatch(/class="marker"[^>]*aria-hidden="true"/);
    expect(html).toContain(ui.en['stack.current']);
  });

  it('localises the credentials', async () => {
    const es = await container.renderToString(Stack, { props: { lang: 'es' } });
    expect(text(es)).toContain(ui.es['stack.msc']);
    expect(text(es)).toContain(ui.es['stack.languages']);
  });
});

describe('Contact', () => {
  it('renders a mailto link for the address', async () => {
    const html = await container.renderToString(Contact, { props: { lang: 'en' } });
    expect(html).toContain(`href="mailto:${shared.email}"`);
  });

  it('marks the social profiles rel="me noopener"', async () => {
    const html = await container.renderToString(Contact, { props: { lang: 'en' } });
    expect(html).toMatch(/href="[^"]*linkedin[^"]*"[^>]*rel="me noopener"/);
    expect(html).toMatch(/href="[^"]*github[^"]*"[^>]*rel="me noopener"/);
  });

  it('shows the package version and the deployed commit in the footer', async () => {
    const html = await container.renderToString(Contact, { props: { lang: 'en' } });
    const { version } = await import('../package.json');
    const { commitSha } = await import('../src/lib/build-info');
    expect(text(html)).toContain(`portfolio v${version}`);
    // The version only moves on a release, so the commit is what tells a
    // visitor which build they are actually looking at.
    if (commitSha) expect(text(html)).toContain(`v${version} (${commitSha})`);
  });

  it('localises the contact prompt', async () => {
    const es = await container.renderToString(Contact, { props: { lang: 'es' } });
    expect(text(es)).toContain(ui.es['contact.command']);
  });
});

describe('locale rendering is exhaustive', () => {
  // Renders every component in both locales and asserts nothing leaks the
  // other language's copy into the page.
  it('never renders English-only copy on the Spanish page', async () => {
    const components = [Header, Hero, StatBand, Stack, Contact];
    const rendered = await Promise.all(
      components.map((c) => container.renderToString(c, { props: { lang: 'es' } })),
    );
    const body = text(rendered.join(' '));

    const englishOnly = [
      ui.en['hero.pitch'],
      ui.en['stats.1'],
      ui.en['stack.shipped'],
      ui.en['contact.command'],
      ui.en['boot.4'],
    ];
    for (const phrase of englishOnly) {
      expect(body, `English copy leaked into the Spanish render: ${phrase}`).not.toContain(phrase);
    }
  });
});

describe('untrusted release data reaches the DOM as text', () => {
  it('escapes markup coming from the GitHub API', async () => {
    const hostile = {
      ...project,
      data: {
        ...project.data,
        version: '<img src=x onerror=alert(1)>',
        releases: [
          {
            tag: '</script><script>alert(1)</script>',
            date: '2026-01-01',
            note: '<svg onload=alert(1)>',
          },
        ],
      },
    };
    const html = await container.renderToString(ProjectCard, {
      props: { project: hostile, lang: 'en' },
    });

    // Astro escapes expressions by default; assert that rather than trust it.
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<svg onload');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;');
  });
});
