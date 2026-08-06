/**
 * Release data for the projects registry.
 *
 * Fetched at build time so the deployed HTML is always correct and the page
 * never depends on GitHub being reachable from a visitor's network. The client
 * re-fetches on load as a progressive refresh (see ReleaseData.astro), which
 * only matters for a visitor sitting on the page when a release lands.
 *
 * Build-time requests use GITHUB_TOKEN when present (CI sets it) purely to lift
 * the unauthenticated 60 req/hour limit. The token never reaches the client.
 */

export interface Release {
  tag: string;
  date: string;
  note: string;
}

export interface ReleaseData {
  version: string;
  lastShip: string;
  releaseCount: number;
  releases: Release[];
  /** False when the fetch failed and the registry fallback is being shown. */
  live: boolean;
}

const NOTE_MAX = 62;

/**
 * The first bulleted line of a release body, stripped of markdown noise.
 * Ported from the design prototype so the output matches the reference exactly.
 */
export function firstLine(body: string | null | undefined): string {
  if (!body) return '—';
  const bullet = body
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.startsWith('*') || s.startsWith('-'));

  const line = (bullet || body.split('\n')[0] || '')
    .replace(/^[*-]\s*/, '') // bullet marker
    .replace(/\*\*/g, '') // bold markers
    .replace(/\(\[.*$/, '') // trailing ([#123](url)) link
    .replace(/\[|\]/g, '') // stray brackets
    .trim();

  if (!line) return '—';
  return line.length > NOTE_MAX ? `${line.slice(0, NOTE_MAX)}…` : line;
}

interface GitHubRelease {
  tag_name?: string;
  published_at?: string | null;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
}

export function toReleaseData(list: GitHubRelease[]): ReleaseData | null {
  const published = list.filter((r) => !r.draft && !r.prerelease && r.tag_name);
  if (published.length === 0) return null;

  const releases = published.slice(0, 4).map((r) => ({
    tag: String(r.tag_name),
    date: (r.published_at || '').slice(0, 10),
    note: firstLine(r.body),
  }));

  return {
    version: String(published[0].tag_name).replace(/^v/, ''),
    lastShip: (published[0].published_at || '').slice(0, 10),
    releaseCount: published.length,
    releases,
    live: true,
  };
}

/** One in-flight request per repo, shared across the locale pages. */
const inFlight = new Map<string, Promise<ReleaseData | null>>();

async function request(slug: string): Promise<ReleaseData | null> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sherrerapiqueras-portfolio-build',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // per_page=100 so `releaseCount` is a real count rather than a page size.
  const url = `https://api.github.com/repos/${slug}/releases?per_page=100`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      console.warn(`[releases] ${slug}: HTTP ${res.status} — using registry fallback`);
      return null;
    }
    const list = (await res.json()) as GitHubRelease[];
    if (!Array.isArray(list)) return null;
    return toReleaseData(list);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(`[releases] ${slug}: ${reason} — using registry fallback`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchReleases(slug: string): Promise<ReleaseData | null> {
  let pending = inFlight.get(slug);
  if (!pending) {
    pending = request(slug);
    inFlight.set(slug, pending);
  }
  return pending;
}
