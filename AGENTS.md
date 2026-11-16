# AGENTS.md: ninegene.com

Personal site of ALO (ninegene): projects, learning resources and notes. Static Astro site, Markdown content, hosted on AWS (private S3 + CloudFront) with infrastructure in Pulumi. This file adds to the workspace `AGENTS.md`; where they differ, this file wins for this repo.

## This repo is public

Everything here is visible to the world, including the content.

- **Naming:** the owner is "ALO, known to some as Gene". ninegene is only the username. The full name appears only as a hover tooltip (`<span title="...">ALO</span>`), never as visible text.
- **Employer (365 Retail Markets):** describe capabilities only. No internal system, tool, team or customer names beyond public vendors, no architecture diagrams, no code, no metrics unless the owner supplies publishable ones. Link only the public product pages.
- **Teaching:** describe the weekend class in general terms. Never name, picture or schedule students.
- **Infrastructure:** never commit the AWS account ID, keys or `.env` files. The account ID is a GitHub environment secret.
- No pronouns for the owner in site copy; write in the first person.

## Commands

Use `just` (see `justfile`):

| Command              | What it does                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `just setup`         | Install site and infra dependencies                                                       |
| `just dev`           | Dev server at http://127.0.0.1:4321 (shows draft notes)                                   |
| `just preview`       | Build and serve `dist/`                                                                   |
| `just check`         | Everything CI runs: Prettier, `astro check`, build, infra typecheck and tests, ShellCheck |
| `just infra-preview` | `pulumi preview` (needs AWS credentials; read-only)                                       |

## Layout

- `src/content/projects/*.md`: one file per project. Front matter is validated by `src/content.config.ts`. A body (the "engineering story") gives the project its own page; no body means a list entry only.
- `src/content/notes/*.md`: notes. `draft: true` notes appear only in `astro dev`, never in the build or RSS.
- `src/pages/`: Home, Projects, Learn, Notes, About, plus `uses`, `404`, `rss.xml`, `robots.txt`.
- `src/styles/global.css`: the whole design system (see below).
- `infra/pulumi/`: hosting (zone with Fastmail mail records, bucket, CloudFront, certificate, deploy role). `infra/bootstrap/bootstrap.sh`: one-time Pulumi state bucket, KMS key and GitHub OIDC provider. Runbook: `infra/README.md`.
- `.github/workflows/ci.yml` checks every PR and push; `deploy.yml` deploys `main` after CI passes.

## Content rules

- Status words are fixed: `available`, `in development`, `planned`, `historical`. Use the one that is true today; check the live URL before marking something available.
- Each project story answers: who needed help, what I built or led, the tradeoffs that mattered, where it stands. No invented numbers; take facts from the project's own repo docs and say nothing they don't support.
- Link private projects to nothing (the entry shows "source: private").
- Write plainly. No marketing words, no "passionate", no emoji.

## Design rules

The site borrows the structure of a man page (header and footer lines, upper-case section names, indented bodies, `$ ls` navigation) but is set for reading: IBM Plex Sans body at about 18px with a 68-character measure; IBM Plex Mono only for labels, metadata, commands and section names. Warm paper background, one accent colour, light and dark from `prefers-color-scheme`. No hero, card grids, gradients, animations, icons or client JavaScript.

## Formatting gotcha

`.astro` files are not formatted by Prettier, and `compressHTML` is off: Astro 7's compression drops the space between text and a link on the next line, and the Prettier Astro plugin adds visible spaces inside inline elements. Keep the text of an inline element (`<a>`, `<span>`) on the same line as its tags.
