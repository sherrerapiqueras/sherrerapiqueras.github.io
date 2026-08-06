# AGENTS.md

Single source of truth for conventions in this repo. Read this before changing anything.
[`CONTRIBUTING.md`](CONTRIBUTING.md) is the human-facing quick start and does not contradict this.

## What this is

A static, single-page personal portfolio for Sergio Herrera Piqueras. Astro 7, no client framework,
deployed to GitHub Pages. Two locales as real routes: `/` (English) and `/es/` (Spanish).

It exists to make a consulting client take him seriously in thirty seconds. That is the bar for any
change: does it make the site clearer, faster, or more current? "Modern", "richer" and "more
interactive" are not reasons.

## Layout

```
src/
  assets/        Images processed by Astro (Tempo screenshots)
  components/    One .astro per band of the page, styles scoped inside it
  i18n/          ui.ts = ALL copy, both locales · utils.ts = t(), locale + base helpers
  layouts/       Base.astro — <head>, metadata, JSON-LD, blocking theme script
  lib/           projects.ts = the registry · github.ts = release fetch + fallback
  pages/         index.astro (en) · es/index.astro (es) — both just render Page.astro
  styles/        global.css — token table, reset, shared primitives
public/          Served verbatim: CV PDF, og.png, favicon
scripts/         make-og.mjs — regenerates the social card
```

## Hard rules

1. **Copy lives in `src/i18n/ui.ts`.** Never inline a user-facing string in a component. Every key
   exists in both `en` and `es`. Strings identical in both go in `shared`, not duplicated.
2. **Adding a project = one entry in `PROJECTS`** (`src/lib/projects.ts`), nothing else. Every
   project entry needs a `fallback` with last-known-good data. If a change breaks the one-entry
   property, it is the wrong change.
3. **Tokens, not hex.** Colours come from the custom properties in `global.css`. Do not introduce a
   new colour without a token, and do not hand-tune a token per component.
4. **Styles are scoped.** Component CSS lives in that component's `<style>`. `global.css` holds only
   the token table, the reset, and genuinely shared primitives.
5. **No client framework, no runtime dependency.** Interactive behaviour is vanilla in an Astro
   `<script>`. Do not add React/Vue/Svelte, a router, an animation library, or an icon set.
6. **No icons.** The only glyphs are typographic: `↗ ↓ ● ◆ ✓ ☾ ☀ →`. Do not substitute an icon font
   or SVG set for them.
7. **Radius is 0 and there are no shadows**, except header toggles (2px) and status dots (50%).
8. **Untrusted data is rendered as text.** GitHub API output goes through `textContent` or Astro
   escaping. Never `innerHTML` / `set:html` / `eval` on fetched data. See `SECURITY.md`.

## Gotchas that have already bitten

- **Astro scoped styles and runtime DOM.** Astro stamps a `data-astro-cid-*` attribute at build
  time. An element made with `document.createElement` does not have it and renders **unstyled**.
  When client script must add markup, clone a server-rendered node. See `refresh()` in
  `Projects.astro`.
- **Canvas sizing.** The hero canvas must re-measure on `ResizeObserver`, not `window.resize`. The
  hero changes height when the web font loads, and a window listener misses it — leaving the backing
  store at its pre-font size and letting CSS stretch it into visible smearing.
- **Six colour tokens deliberately differ from the handoff.** `--faint`, `--dim` and light `--teal`
  were moved to clear WCAG AA 4.5:1, and `--magFill` was added so white text on magenta passes
  without dulling the decorative accent. Do not "restore" them to the design doc's values; the
  design doc itself asks for AA. The full table and reasoning are at the top of `global.css`.
- **`--mag` vs `--magFill`.** `--mag` is for decorative marks (caret, section numbers, ticker
  diamonds, employer dot, the `+` in `6+`). `--magFill` is for magenta _behind text_. Putting text
  on `--mag` in dark theme drops it to 3.5:1. If you add a magenta surface with text, use
  `--magFill`.
- **`releaseCount` is live, not 32.** The design prototype hardcoded 32 and never refreshed it. The
  real count comes from the API.

## Design spec

The authoritative spec is the design handoff README (118px/−0.055em hero, 1120px content, 56px page
padding, 64px section rhythm, 1px-gap grid dividers). `global.css` and the component styles
reproduce it exactly. If you are changing a measurement, you need a reason beyond taste.

## Commits

Conventional Commits — release-please reads them.
`<type>(#<id>): <description>` with an issue, `<type>: <description>` without.
Types: `feat`, `fix`, `content`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`,
`build`. Use `content` for copy changes so they appear in the changelog.

Branch off `main`, never commit to `main` directly.

## Before you open a PR

```bash
npm run format && npm run check && npm run build
```

Then check the result at 1280px, 900px and 600px, in both themes and both locales.
