import { afterEach, describe, expect, it, vi } from 'vitest';
import { PROJECTS, resolveProjects } from '../src/lib/projects';
import { languages, ui, type Lang } from '../src/i18n/ui';

/**
 * The registry carries a promise: adding a project is one entry and nothing
 * else. These assert the shape that promise depends on, so a half-added entry
 * fails here rather than rendering a broken card in production.
 */

const locales = Object.keys(languages) as Lang[];

afterEach(() => vi.unstubAllGlobals());

describe('registry entries', () => {
  it('is not empty', () => {
    expect(PROJECTS.length).toBeGreaterThan(0);
  });

  it.each(PROJECTS.map((p) => [p.name, p] as const))('%s is well formed', (_name, project) => {
    expect(project.slug, 'slug must be owner/repo').toMatch(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    expect(project.name.trim()).not.toBe('');
    expect(project.tech.length).toBeGreaterThan(0);
    expect(project.license.trim()).not.toBe('');
  });

  it.each(PROJECTS.map((p) => [p.name, p] as const))(
    '%s has copy in every locale',
    (_name, project) => {
      for (const lang of locales) {
        expect(ui[lang][project.descriptionKey], `${lang}: ${project.descriptionKey}`).toBeTruthy();
        for (const shot of project.screenshots) {
          expect(ui[lang][shot.altKey], `${lang}: ${shot.altKey}`).toBeTruthy();
        }
      }
    },
  );

  it.each(PROJECTS.map((p) => [p.name, p] as const))(
    '%s has a screenshot per locale',
    (_name, project) => {
      /*
       * Astro's image pipeline yields an ImageMetadata object; outside Astro
       * (here) the same import resolves to a URL string. Compare on the
       * underlying path so the assertion holds in both.
       */
      const path = (img: unknown) =>
        typeof img === 'string' ? img : ((img as { src: string })?.src ?? '');

      for (const shot of project.screenshots) {
        for (const lang of locales) {
          expect(shot.src[lang], `${lang} screenshot missing`).toBeTruthy();
          // Astro appends ?origWidth=… to the resolved asset URL.
          expect(path(shot.src[lang]), `${lang} screenshot has no path`).toMatch(
            /\.(png|jpe?g|webp|avif)(\?|$)/,
          );
        }
        // Serving one locale's screenshots to the other defeats the point of
        // having locale routes at all.
        expect(path(shot.src.en)).not.toBe(path(shot.src.es));
        expect(path(shot.src.es), 'Spanish screenshot should be the _es file').toMatch(/_es\./);
        expect(path(shot.src.en), 'English screenshot should not be the _es file').not.toMatch(
          /_es\./,
        );
      }
    },
  );

  it.each(PROJECTS.map((p) => [p.name, p] as const))(
    '%s uses https links only',
    (_name, project) => {
      expect(project.links.github.startsWith('https://')).toBe(true);
      expect(project.links.changelog.startsWith('https://')).toBe(true);
      if (project.links.playStore) {
        expect(project.links.playStore.startsWith('https://')).toBe(true);
      }
    },
  );

  it.each(PROJECTS.map((p) => [p.name, p] as const))(
    '%s has usable fallback data',
    (_name, project) => {
      const { fallback } = project;
      expect(fallback.version).toMatch(/^\d+\.\d+\.\d+/);
      expect(fallback.lastShip).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fallback.releaseCount).toBeGreaterThan(0);
      expect(fallback.releases.length).toBeGreaterThan(0);
      expect(fallback.releases.length).toBeLessThanOrEqual(4);

      for (const r of fallback.releases) {
        expect(r.tag).toMatch(/^v?\d+\.\d+\.\d+/);
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(r.note.trim()).not.toBe('');
        // Matches the truncation the live path applies, so fallback and live
        // rows cannot render at visibly different lengths.
        expect(r.note.length).toBeLessThanOrEqual(63);
      }
    },
  );

  it('the github link matches the slug it fetches from', () => {
    for (const project of PROJECTS) {
      expect(project.links.github).toContain(project.slug);
    }
  });
});

describe('resolveProjects', () => {
  it('falls back, and marks the data not live, when the API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );

    const resolved = await resolveProjects();
    expect(resolved).toHaveLength(PROJECTS.length);

    for (const [i, project] of resolved.entries()) {
      expect(project.data.live).toBe(false);
      expect(project.data.version).toBe(PROJECTS[i].fallback.version);
      expect(project.data.releases).toEqual(PROJECTS[i].fallback.releases);
    }
  });

  it('never rejects, so a failed fetch cannot break the build', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('boom');
      }),
    );
    await expect(resolveProjects()).resolves.toBeInstanceOf(Array);
  });

  it('always yields renderable data regardless of the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 403 }) as unknown as Response),
    );
    for (const project of await resolveProjects()) {
      expect(project.data.version).toBeTruthy();
      expect(project.data.lastShip).toBeTruthy();
      expect(project.data.releaseCount).toBeGreaterThan(0);
      expect(project.data.releases.length).toBeGreaterThan(0);
    }
  });
});
