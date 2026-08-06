# CLAUDE.md

See **[`AGENTS.md`](AGENTS.md)** — it is the single source of truth for conventions in this repo.

Quick orientation:

- Static Astro 7 site, no client framework, deployed to GitHub Pages.
- All copy is in `src/i18n/ui.ts`, in both `en` and `es`. Never inline a string in a component.
- Adding a project means adding one entry to `PROJECTS` in `src/lib/projects.ts` and nothing else.
- Verify with `npm run format && npm run check && npm run build`.
