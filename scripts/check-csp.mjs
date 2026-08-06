#!/usr/bin/env node
/**
 * Verifies the Content-Security-Policy in the built output.
 *
 * The site is served from GitHub Pages, which cannot set response headers, so
 * the policy ships as a <meta> element with a sha256 hash per inline script.
 * Astro hashes the scripts it bundles, but `is:inline` scripts are left alone —
 * their hashes come from `security.csp.scriptDirective.hashes` in the config.
 *
 * A stale or missing hash fails silently in the worst way: the browser refuses
 * to run the script, the theme flashes or the toggle dies, and nothing surfaces
 * except a console error nobody is looking at. So this asserts that every
 * executable inline script in every built page is actually covered.
 *
 *   node scripts/check-csp.mjs
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

/** Directives that must be present and must not have been loosened. */
const REQUIRED = [
  ['default-src', "'none'"],
  ['base-uri', "'none'"],
  ['form-action', "'none'"],
  ['connect-src', 'https://api.github.com'],
];

/** Never acceptable in this project — they would defeat the point of the policy. */
const FORBIDDEN = ["'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", '*'];

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

const sha256 = (s) => `sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}`;

let failures = 0;
const fail = (msg) => {
  console.error(`  ✗ ${msg}`);
  failures++;
};

const pages = await htmlFiles(dist);
if (pages.length === 0) {
  console.error('check-csp: no HTML in dist/ — run `npm run build` first');
  process.exit(1);
}

for (const page of pages) {
  const rel = path.relative(root, page);
  const html = await readFile(page, 'utf8');

  const meta = html.match(/content-security-policy"\s+content="([^"]*)"/i);
  if (!meta) {
    fail(`${rel}: no CSP meta element`);
    continue;
  }
  const csp = meta[1];

  for (const [directive, value] of REQUIRED) {
    const found = csp.match(new RegExp(`${directive}[^;]*`));
    if (!found) fail(`${rel}: missing directive "${directive}"`);
    else if (!found[0].includes(value)) {
      fail(`${rel}: "${directive}" does not include ${value} — got "${found[0].trim()}"`);
    }
  }

  for (const token of FORBIDDEN) {
    // `*` only counts as a bare source, not inside https://host/* or a hash.
    const bare = new RegExp(`(^|[;\\s])${token.replace(/[*]/g, '\\*')}([;\\s]|$)`);
    if (bare.test(csp)) fail(`${rel}: policy contains ${token}`);
  }

  const hashes = new Set([...csp.matchAll(/'(sha256-[^']+)'/g)].map((m) => m[1]));

  let checked = 0;
  // Leading comma skips match[0] (the whole tag) — without it `body` binds to
  // the attribute string instead of the script body.
  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=/.test(attrs)) continue; // external, covered by 'self'
    if (/ld\+json/.test(attrs)) continue; // data block, never executed
    checked++;
    if (!hashes.has(sha256(body))) {
      fail(`${rel}: inline script (${body.length}b) has no matching hash in script-src`);
    }
  }
  console.log(`  ✓ ${rel} — ${checked} inline script(s) covered, ${hashes.size} hashes`);
}

if (failures > 0) {
  console.error(`\ncheck-csp: ${failures} problem(s) found`);
  process.exit(1);
}
console.log(`\ncheck-csp: ${pages.length} page(s) OK`);
