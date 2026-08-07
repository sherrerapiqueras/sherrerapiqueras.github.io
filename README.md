# sherrerapiqueras.github.io

[![CI](https://github.com/sherrerapiqueras/sherrerapiqueras.github.io/actions/workflows/ci.yml/badge.svg)](https://github.com/sherrerapiqueras/sherrerapiqueras.github.io/actions/workflows/ci.yml)
[![Deploy](https://github.com/sherrerapiqueras/sherrerapiqueras.github.io/actions/workflows/deploy.yml/badge.svg)](https://github.com/sherrerapiqueras/sherrerapiqueras.github.io/actions/workflows/deploy.yml)

Personal site for **Sergio Herrera Piqueras** — software engineer.
Live at **https://sherrerapiqueras.github.io**.

A single static page in English and Spanish, built with Astro and deployed to GitHub Pages.
The projects section reads version, status and release history live from each project's GitHub
releases, so shipping a release anywhere updates this site without a commit here.

## Stack

| Area       | Choice                                                                 |
| :--------- | :--------------------------------------------------------------------- |
| Framework  | Astro 7 (static output, zero client framework)                         |
| Styling    | Vanilla CSS — design tokens as custom properties, scoped per component |
| i18n       | Astro i18n, real locale routes (`/` and `/es/`)                        |
| Fonts      | JetBrains Mono + IBM Plex Mono, self-hosted via Fontsource             |
| Images     | Astro `<Picture>` — AVIF/WebP at 1× and 2×                             |
| Hosting    | GitHub Pages via GitHub Actions                                        |
| Testing    | Vitest (units + rendered components), Playwright + axe (end-to-end)    |
| Security   | CSP with per-script hashes, generated at build time                    |
| Versioning | release-please (Conventional Commits)                                  |

There is no JavaScript framework and no client-side router. The only scripts that ship are the
theme toggle, the hero canvas, and the release refresh — all vanilla, all a few hundred bytes.

## Getting started

```bash
npm ci
npm run dev
```

| Script                  | What it does                                            |
| :---------------------- | :------------------------------------------------------ |
| `npm run dev`           | Dev server on http://localhost:4321                     |
| `npm run build`         | Static build into `dist/`                               |
| `npm run preview`       | Serve the built output                                  |
| `npm run check`         | `astro check` — types and template validation           |
| `npm test`              | Vitest — units and rendered components                  |
| `npm run test:e2e`      | Playwright + axe, against the production build          |
| `npm run test:coverage` | Coverage over `src/lib` and `src/i18n`, with thresholds |
| `npm run check:csp`     | Asserts every inline script is covered by a CSP hash    |
| `npm run format`        | Prettier, write                                         |
| **`npm run verify`**    | **Everything CI runs, as one exit code**                |
| `npm run verify:all`    | `verify` plus the end-to-end suite                      |

Use `npm run verify` rather than reading each step's output — `astro check` ends with
"0 warnings / 0 hints" whether or not the line above it says "5 errors".

## Adding a project

Add one entry to `PROJECTS` in [`src/lib/projects.ts`](src/lib/projects.ts). Nothing else needs
touching — version, release count, last-ship date and the release log come from the repo's GitHub
releases at build time.

```ts
{
  slug: 'owner/repo',        // the only thing live data keys off
  name: 'Project',
  descriptionKey: 'project.description',   // add the copy to src/i18n/ui.ts, both locales
  tech: ['KOTLIN', '…'],
  license: 'Apache-2.0',
  links: { github: '…', changelog: '…', playStore: null },
  fallback: { /* last known good — renders if the API call fails */ },
}
```

`fallback` matters: the unauthenticated GitHub API allows 60 requests/hour per IP, and a build on a
busy runner can hit that. When the fetch fails the build logs a warning and ships the fallback, so
the page is never empty and never wrong-looking. Keep it roughly current.

The `[ pending ]` slot under the card is deliberate — it signals more work is coming. Delete it from
[`src/components/Projects.astro`](src/components/Projects.astro) once there are two or more projects.

## How the live release data works

1. **At build time** `resolveProjects()` fetches `/repos/{slug}/releases` and renders the result
   into the HTML. This is the copy that search engines and social cards see.
2. **In the browser** the same fetch runs again and swaps in anything newer. It only matters for a
   visitor sitting on the page when a release lands.
3. **Daily** a scheduled job compares the live site against the API and rebuilds _only if they
   differ_ ([`scripts/check-upstream.mjs`](scripts/check-upstream.mjs)). A scheduled rebuild is an
   unattended deploy, so doing one every night regardless would be a nightly chance to publish a
   regression for a page that usually has not changed. Typical run: three HTTP requests, no deploy.

CI passes `GITHUB_TOKEN` to the build purely to lift the rate limit. It is never exposed to the
client — the browser fetch is unauthenticated, and CI greps `dist/` for token material as a guard.

## Content and translations

All copy lives in [`src/i18n/ui.ts`](src/i18n/ui.ts), in both locales. Strings that are deliberately
identical in both — paths, proper nouns, the stack block labels, the project meta labels — live in
`shared` rather than being duplicated.

Adding a key means adding it to `en` and `es`. `t()` falls back to English for a missing key rather
than rendering the raw key.

Two assets are localised as well, since serving the wrong language would undercut the point of
having locale routes at all:

- **The CV** — `public/assets/cv_sergio_herrera_{en,es}.pdf`, selected by the `hero.cvFile` key.
- **The Tempo screenshots** — `src/assets/tempo_*_es.png` alongside the English ones, selected by
  `screenshots[].src[lang]` in the registry. Source of truth is
  `mandrecode/tempo` → `distribution/screenshots/phone/phone_{en,es}_*`.

## Design

The design tokens in [`src/styles/global.css`](src/styles/global.css) come from the design handoff
and are reproduced exactly, with six colour values changed to clear WCAG AA (4.5:1 for normal text).
The handoff lists AA as a gap that must be fixed; it flagged `--faint` and missed the rest.

| Token       | Theme | Handoff   | Here      | Ratio       |
| :---------- | :---- | :-------- | :-------- | :---------- |
| `--faint`   | dark  | `#3F444C` | `#767C86` | 2.03 → 4.74 |
| `--dim`     | dark  | `#5D646E` | `#868C96` | 3.33 → 5.89 |
| `--faint`   | light | `#A3A5A9` | `#656769` | 2.18 → 5.02 |
| `--dim`     | light | `#77797D` | `#5F6165` | 3.86 → 5.49 |
| `--teal`    | light | `#0B8C7B` | `#09796A` | 3.68 → 4.70 |
| `--magFill` | dark  | `#FF2E88` | `#E00A72` | 3.50 → 4.71 |

`--magFill` is a token this repo adds. Magenta behind text (the hero CTA, the contact slab, the skip
link) has to be darker for white to pass, but `--mag` is also used for decorative marks — the caret,
the section numbers, the ticker diamonds, the `+` in `6+` — where the vivid `#FF2E88` is the point
and contrast is already fine. Splitting the token fixes the text without dulling the accent.

One further deviation is not a token: the contact prompt's `opacity: .85`. At 85% the white
composites to `#FADAEA` against the magenta slab — 3.65:1, under AA for 11px text — and any dimming
at all falls below the threshold, so the opacity is gone rather than reduced. It was found by axe,
not by hand: a contrast check that reads the _declared_ colour cannot see opacity compositing.

Both themes measure zero AA failures across every text node on the page, and
`npm run test:e2e` re-checks that with axe on every commit, in both themes and both locales. The
comment at the top of `global.css` records the reasoning and how to revert.

Everything else — 118px hero, −0.055em tracking, radius 0, 1px-gap grid dividers, no shadows — is
reproduced exactly. The one content difference: `RELEASES` shows the live count (41 at time of
writing), not the prototype's hardcoded 32.

## Testing

| Suite                            | Covers                                                                |
| :------------------------------- | :-------------------------------------------------------------------- |
| `tests/github.test.ts`           | Every way the GitHub API can fail. `fetchReleases` must never reject  |
| `tests/refresh-releases.test.ts` | The client refresh — failures must leave the DOM byte-for-byte intact |
| `tests/components.test.ts`       | Each `.astro` rendered and asserted: aria, hrefs, per-locale wiring   |
| `tests/i18n.test.ts`             | Key parity across locales, locale detection, path helpers             |
| `tests/projects.test.ts`         | Registry invariants — a half-added project fails here                 |
| `e2e/journeys.spec.ts`           | Theme persistence, route switching, overflow, CSP, asset resolution   |
| `e2e/accessibility.spec.ts`      | axe, both themes × both locales                                       |

Coverage is measured over `src/lib` and `src/i18n` only, with thresholds enforced. Astro compiles
`.astro` to JS with generated wrappers, so a line-coverage number there measures the compiler rather
than the components — those are covered by asserting rendered output instead.

When adding a test, check that it can actually fail: break the source, confirm it goes red, restore.
The 403/404/500 cases originally passed with the `res.ok` check deleted, because the stubs returned
an empty body that was rejected further down — green for the wrong reason.

## Security

Full detail in [`SECURITY.md`](SECURITY.md). In short:

- **No secret ever reaches the client.** The build may read `GITHUB_TOKEN` to lift the API rate
  limit; the browser fetch is unauthenticated. CI greps `dist/` for credential shapes _and_ for any
  authenticated-request path surviving into the bundle.
- **A CSP ships as a `<meta>`** (GitHub Pages cannot set headers) with a sha256 hash per inline
  script — no `'unsafe-inline'`. `default-src 'none'`; the only external origin is
  `api.github.com`. `npm run check:csp` fails if a hash goes stale or the policy is loosened.
- **GitHub API output is untrusted input**, rendered via `textContent` or Astro escaping only.
- **Actions are pinned by commit SHA**, so a moved tag cannot change what runs.

## Deployment

Pushes to `main` build and deploy to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), gated on the end-to-end suite.

### Repo settings

Both are configured. Recorded here because neither lives in version control, so a fresh clone or a
fork would need them set again:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
   On the legacy branch source, a `pages-build-deployment` job tries to Jekyll-build the repo and
   fails on `.astro` frontmatter — harmless to the site, since the Actions deploy publishes over it,
   but a red X on every push.
2. **Settings → Actions → General → Workflow permissions →** _Allow GitHub Actions to create and
   approve pull requests._
   Without it release-please creates its release branch and then cannot open the PR.

Still open: protect `main` — require the CI check and a PR before merging.

## Licence

Code is MIT ([`LICENSE`](LICENSE)). The written content, the CV, and the Tempo screenshots are not
covered by it — please don't reuse those.
