# Roadmap

Planned work for ninegene.com, roughly in order. Nothing here is live yet.

## Notes

A Notes section: short write-ups on what I learn from building and running software, with an RSS feed. It is hidden until the first notes are written, so the site never shows an empty section.

Three outlines are waiting in `src/content/notes/` (all `draft: true`):

- `release-automation-before-ai.md`
- `troubleshooting-tools-that-return-evidence.md`
- `teaching-with-ai-without-losing-understanding.md`

The pages and feed are already built and kept hidden: Astro skips files in `src/pages/` whose names start with `_`. To bring the section back once at least one note is ready to publish:

1. Rename `src/pages/_notes/` to `src/pages/notes/` and `src/pages/_rss.xml.ts` to `src/pages/rss.xml.ts`.
2. Add `notes/` to the navigation in `src/layouts/Base.astro`, the RSS `<link rel="alternate">` in its `<head>`, a `notes/` line in the home page SYNOPSIS, and a "Recent notes" section on the home page (`getNotes()` in `src/lib/content.ts`).
3. Link the feed from the Learn page, add `/notes/` and `/rss.xml` to the smoke check in `.github/workflows/deploy.yml`, and update `AGENTS.md` and `README.md`.
4. Set `draft: false` on the notes to publish and run `just check`.

## Later

- A `/now` page: what I'm working on and learning this month.
- Open Graph images for each page, generated at build time in the site's man-page style.
- Tighten DMARC from `p=none` to `p=quarantine` once the reports are clean (see `infra/README.md`).
- Subdomains for dev-practice and shell-lab as each launches (shell-explain launched at `shell-explain.ninegene.com`, hosted from its own repository).
