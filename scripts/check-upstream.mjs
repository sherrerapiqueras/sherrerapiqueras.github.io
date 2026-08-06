#!/usr/bin/env node
/**
 * Decides whether a scheduled run has anything worth publishing.
 *
 * The site bakes each project's release data into its HTML at build time, so it
 * goes stale when a tracked repo ships. A nightly rebuild fixes that but also
 * means a nightly unattended deploy — a daily chance to publish a regression
 * nobody asked for, for a page that usually has not changed.
 *
 * So instead: compare what the live site is showing against what the GitHub API
 * reports, and only deploy when they differ. Typical result is "no", and nothing
 * is built or published.
 *
 * The live page is the source of truth for what to check — it carries its own
 * `data-project` slugs and the values it is displaying — so this needs no copy
 * of the registry and cannot drift from it.
 *
 *   node scripts/check-upstream.mjs [siteUrl]
 *
 * Writes `changed=true|false` to $GITHUB_OUTPUT when running in Actions.
 * Exits 0 either way; a failure to decide is reported as "changed" so a broken
 * check never silently freezes the site.
 */

import { appendFile } from 'node:fs/promises';

const SITE = process.argv[2] || process.env.SITE_URL || 'https://sherrerapiqueras.github.io/';

const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'sherrerapiqueras-portfolio-upstream-check',
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function report(changed, reason) {
  console.log(changed ? `changed: ${reason}` : `up to date: ${reason}`);
  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
  }
  process.exit(0);
}

/** Pull the deployed slug + the values it is currently rendering. */
function readLiveState(html) {
  const cards = [];
  // Each project card carries data-project; the fields live inside it.
  for (const m of html.matchAll(/data-project="([^"]+)"([\s\S]*?)<\/article>/g)) {
    const [, slug, body] = m;
    const field = (name) => {
      const f = body.match(new RegExp(`data-field="${name}"[^>]*>([^<]*)<`));
      return f ? f[1].trim() : null;
    };
    cards.push({ slug, version: field('version'), releaseCount: field('releaseCount') });
  }
  return cards;
}

async function latestUpstream(slug) {
  const res = await fetch(`https://api.github.com/repos/${slug}/releases?per_page=100`, {
    headers,
  });
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const list = await res.json();
  if (!Array.isArray(list)) throw new Error(`${slug}: unexpected payload`);
  const published = list.filter((r) => !r.draft && !r.prerelease && r.tag_name);
  if (published.length === 0) throw new Error(`${slug}: no published releases`);
  return {
    version: String(published[0].tag_name).replace(/^v/, ''),
    releaseCount: published.length,
  };
}

try {
  const res = await fetch(SITE, { headers: { 'User-Agent': headers['User-Agent'] } });
  if (!res.ok) {
    // Not published yet, or Pages is having a moment — build and find out.
    await report(true, `site returned HTTP ${res.status}`);
  }

  const live = readLiveState(await res.text());
  if (live.length === 0) await report(true, 'no project cards found on the live site');

  for (const card of live) {
    const upstream = await latestUpstream(card.slug);
    const liveVersion = (card.version || '').replace(/^v/, '');

    if (liveVersion !== upstream.version) {
      await report(true, `${card.slug} ${liveVersion || '(none)'} -> ${upstream.version}`);
    }
    if (card.releaseCount !== String(upstream.releaseCount)) {
      await report(
        true,
        `${card.slug} release count ${card.releaseCount} -> ${upstream.releaseCount}`,
      );
    }
    console.log(`  ${card.slug}: v${upstream.version}, ${upstream.releaseCount} releases — match`);
  }

  await report(false, 'every tracked project matches the live site');
} catch (err) {
  // Deciding wrongly in favour of building is cheap; freezing the site is not.
  await report(true, `check failed (${err instanceof Error ? err.message : err})`);
}
