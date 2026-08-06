import { toReleaseData } from './github';

/**
 * Progressive refresh of a rendered project card.
 *
 * The build already baked correct data into the HTML, so this only matters for
 * someone sitting on the page when a release lands. Every failure path — rate
 * limit, offline, blocked, malformed response — must leave the server-rendered
 * data exactly as it is. That is why there is no spinner and no error state:
 * there is nothing to recover from, because nothing was lost.
 *
 * Lives here rather than inline in Projects.astro so the failure paths can be
 * tested; a component `<script>` is not importable.
 */

const API = 'https://api.github.com/repos';

/** Narrow to the slugs GitHub actually accepts, so nothing can be injected into the URL. */
const SLUG = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export async function refreshCard(
  card: HTMLElement,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  const slug = card.dataset.project;
  if (!slug || !SLUG.test(slug)) return false;

  const res = await fetchImpl(`${API}/${slug}/releases?per_page=100`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return false;

  const payload: unknown = await res.json();
  if (!Array.isArray(payload)) return false;

  const data = toReleaseData(payload);
  if (!data) return false;

  const set = (field: string, value: string) => {
    const el = card.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (el && el.textContent !== value) el.textContent = value;
  };

  set('version', `v${data.version}`);
  set('lastShip', data.lastShip);
  set('releaseCount', String(data.releaseCount));

  const log = card.querySelector('[data-release-log]');
  const template = log?.querySelector('li');
  if (!log || !template) return true;

  /*
   * Clone a server-rendered row rather than building one with createElement.
   * Astro scopes component CSS with a generated `data-astro-cid-*` attribute
   * stamped on at build time, so a freshly created <li> matches none of the
   * component's styles and renders unstyled. Cloning carries the attribute.
   */
  log.replaceChildren(
    ...data.releases.map((release) => {
      const row = template.cloneNode(true) as HTMLElement;
      const tag = row.querySelector('.tag');
      const time = row.querySelector('time');
      const note = row.querySelector('.note');

      // textContent, never innerHTML: release bodies are attacker-influenceable
      // by anyone who can cut a release in a tracked repo.
      if (tag) tag.textContent = release.tag;
      if (time) {
        (time as HTMLTimeElement).dateTime = release.date;
        time.textContent = release.date;
      }
      if (note) note.textContent = release.note;
      return row;
    }),
  );

  return true;
}

/** Refresh every card on the page, swallowing failures per card. */
export function refreshAll(root: ParentNode = document): void {
  for (const card of root.querySelectorAll<HTMLElement>('[data-project]')) {
    refreshCard(card).catch(() => {
      /* keep the server-rendered data */
    });
  }
}
