import { execSync } from 'node:child_process';

/**
 * Identifies the commit this build came from.
 *
 * The footer shows the package version, which only moves when a release PR is
 * merged — so between releases it names the last milestone rather than what is
 * actually deployed. Appending the commit makes the footer honest without
 * forcing a release on every change.
 *
 * Build-time only. This module reaches for `node:child_process`, so it must
 * never be imported from a component `<script>` or anything that ships to the
 * browser; it is used from `.astro` frontmatter, which runs during the build.
 */

const SHORT = 7;

function resolveSha(): string | null {
  // CI sets this, and its checkout may be shallow or detached.
  const fromCi = process.env.GITHUB_SHA;
  if (fromCi && /^[0-9a-f]{7,40}$/i.test(fromCi)) return fromCi.slice(0, SHORT);

  try {
    const out = execSync(`git rev-parse --short=${SHORT} HEAD`, {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();
    return /^[0-9a-f]{7,40}$/i.test(out) ? out : null;
  } catch {
    // No git available (tarball export, some sandboxes) — the version alone
    // is still correct, so this degrades rather than failing the build.
    return null;
  }
}

export const commitSha: string | null = resolveSha();

/** `v1.1.0 (a4e8c79)`, or just `v1.1.0` when the commit cannot be determined. */
export function buildLabel(version: string): string {
  return commitSha ? `v${version} (${commitSha})` : `v${version}`;
}
