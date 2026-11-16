# ninegene.com

Source of [ninegene.com](https://ninegene.com), the personal site of ALO, known to some as Gene: projects and free learning resources.

- **Site:** [Astro](https://astro.build) 7, static output, content in Markdown, no client JavaScript.
- **Hosting:** private S3 bucket behind CloudFront, Route 53 DNS, ACM certificate, all in AWS `us-east-1`, defined with [Pulumi](https://www.pulumi.com) in TypeScript under [infra/](infra/README.md).
- **Deploys:** GitHub Actions with OIDC (no stored keys), after CI passes on `main`.

## Develop

Requires Node.js 26 (LTS) and [just](https://just.systems). With [mise](https://mise.jdx.dev), `mise install` provides Node and Pulumi.

```bash
just setup     # install dependencies
just dev       # http://127.0.0.1:4321
just check     # everything CI checks
```

Add a project in `src/content/projects/`; the front matter fields are defined in `src/content.config.ts`. Planned work, including the Notes section, is in [ROADMAP.md](ROADMAP.md). Conventions for content, design and privacy are in [AGENTS.md](AGENTS.md).

## Infrastructure

See [infra/README.md](infra/README.md) for the one-time setup, the staged first deploy and how DNS and mail move to Route 53.

## History

Until 2026 this repository held an older Hexo blog. Its posts are still in the git history before the Astro rewrite.
