import type { UiKey } from '../i18n/ui';
import { fetchReleases, type Release, type ReleaseData } from './github';

/**
 * The projects registry.
 *
 * Adding a project means adding one entry here — nothing else. Version, status,
 * release count, last-ship date and the release log all come from the repo's
 * GitHub releases at build time. `fallback` is what renders if that fetch fails,
 * so the page is never empty and never blank-looking.
 */

export interface ProjectMeta {
  label: string;
  value: string;
}

export interface ProjectScreenshot {
  /** Path under `src/assets/`, resolved by Astro's image pipeline. */
  src: ImageMetadata;
  captionKey: 'dark' | 'light';
  altKey: UiKey;
  /** The light shot sits lower, per the design. */
  offset?: boolean;
}

export interface Project {
  /** `owner/repo` on GitHub. The only thing the live data keys off. */
  slug: string;
  name: string;
  descriptionKey: UiKey;
  status: 'active';
  tech: string[];
  license: string;
  /** Extra meta cell rendered after LICENSE/RELEASES/LAST SHIP. */
  extraMeta: { labelKey: 'minSdk'; value: string };
  screenshots: ProjectScreenshot[];
  links: {
    github: string;
    changelog: string;
    /** Rendered as a disabled, non-focusable chip until it has a URL. */
    playStore: string | null;
  };
  fallback: Omit<ReleaseData, 'live'>;
}

import tempoDark from '../assets/tempo_focus_dark.png';
import tempoLight from '../assets/tempo_routines_light.png';

export const PROJECTS: Project[] = [
  {
    slug: 'mandrecode/tempo',
    name: 'Tempo',
    descriptionKey: 'tempo.description',
    status: 'active',
    tech: [
      'KOTLIN',
      'JETPACK COMPOSE',
      'CLEAN ARCH + MVI',
      'HILT',
      'ROOM · SQLCIPHER',
      'WORKMANAGER',
    ],
    license: 'Apache-2.0',
    extraMeta: { labelKey: 'minSdk', value: '24' },
    screenshots: [
      { src: tempoDark, captionKey: 'dark', altKey: 'tempo.shotDark' },
      { src: tempoLight, captionKey: 'light', altKey: 'tempo.shotLight', offset: true },
    ],
    links: {
      github: 'https://github.com/mandrecode/tempo',
      changelog: 'https://github.com/mandrecode/tempo/blob/main/CHANGELOG.md',
      playStore: null,
    },
    fallback: {
      version: '1.13.1',
      lastShip: '2026-08-04',
      releaseCount: 32,
      releases: [
        { tag: 'v1.13.1', date: '2026-08-04', note: 'let a settling row slide rather than jump' },
        { tag: 'v1.13.0', date: '2026-08-04', note: 'plan undated tasks without leaving Focus' },
        {
          tag: 'v1.12.0',
          date: '2026-08-03',
          note: 'break sort ties, and let tied tasks be dragged',
        },
        {
          tag: 'v1.11.0',
          date: '2026-07-30',
          note: 'add Focus — a third tab for today, with sessions',
        },
      ],
    },
  },
];

export type ResolvedProject = Project & { data: ReleaseData };

/** Registry entries with live data merged in, falling back per project. */
export async function resolveProjects(): Promise<ResolvedProject[]> {
  return Promise.all(
    PROJECTS.map(async (project) => ({
      ...project,
      data: (await fetchReleases(project.slug)) ?? { ...project.fallback, live: false },
    })),
  );
}

export type { Release, ReleaseData };
