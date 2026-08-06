# Contributing

This is a personal site, so there is not much to contribute to — but bug reports are welcome, and
these are the conventions if you are working on it (including if you are an AI agent).

## Prerequisites

- **Node 24** (see [`.nvmrc`](.nvmrc)).

## Build and verify

```bash
npm ci                   # Install exactly what the lockfile says
npm run dev              # Dev server on :4321
npm run format           # Auto-fix formatting — run before every commit
npm run format:check     # What CI runs
npm run check            # astro check — types and templates
npm run build            # Static build into dist/
```

`npm run verify` runs the whole gate as a single exit code — prefer it over checking each step by
eye. CI runs the same thing.

## Workflow

1. **Branch** off `main` — never commit directly to `main`.
   - With an issue: `<type>/<id>-<slug>` (e.g. `feat/12-projects-filter`)
   - Without: `<type>/<slug>` (e.g. `fix/canvas-resize-smear`)
2. **Commit** using Conventional Commits — release-please reads these to decide the next version
   and to build the changelog.
   - With an issue: `<type>(#<id>): <description>`
   - Without: `<type>: <description>`
   - Types: `feat`, `fix`, `content`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`,
     `build`
   - `content` is for copy changes — it shows up in the changelog, which `chore` and `docs` do not.
3. **Before committing:** run `npm run format`.
4. **Open a PR** against `main`. The title follows the commit format.

## Conventions

- **Copy lives in `src/i18n/ui.ts`**, both locales, never inline in a component. Adding a string
  means adding it to `en` and `es`.
- **Projects are registry entries.** Adding a project must only mean adding an entry to `PROJECTS`
  in `src/lib/projects.ts`. If a change makes that untrue, it is the wrong change.
- **Styles are scoped to their component.** Only genuinely shared primitives (`.heading-row`,
  `.bordered`, the token table) belong in `src/styles/global.css`.
- **Design tokens are not hand-tuned per component.** If a colour is needed, it comes from the token
  table. If a value is not in the table, it probably should not be a colour.
- **No client framework.** Interactive behaviour is vanilla, in an Astro `<script>`, and small.
- **Radius is 0 and shadows do not exist**, except the two documented cases (header toggles, status
  dots). CI does not enforce this; the design does.

## A note on scoped styles

Astro scopes component CSS with a generated `data-astro-cid-*` attribute stamped on at build time.
Elements created at runtime with `document.createElement` do **not** get that attribute and will
render unstyled. When client script needs to add markup, clone a server-rendered node instead — see
`refresh()` in `src/components/Projects.astro`.

## Reporting issues

Use the **Bug report** or **Feature request** templates.
