---
title: agent-skills
summary: Agent skills that work in Claude Code, Codex and other AI coding agents from one copy, for reviewing changes, writing pull requests, Bash scripts and maintaining skills.
status: available
role: Author and maintainer
owner: winmetta
stack: [Markdown, JavaScript, Node.js, Bash]
period: 2026–
repoUrl: https://github.com/winmetta/agent-skills
featured: true
order: 2
---

## Who needed help

I use more than one AI coding agent, and so do the volunteers I work with. Each agent had its own way of loading instructions, so the same review checklist or PR template got copied, edited in one place and forgotten in the other.

## What I built

A catalog of skills in the open Agent Skills format, written so one copy works in every agent:

- **local-change-review** reviews uncommitted work before a commit, checks each finding again in a separate pass, and fixes what it finds until a review comes back clean.
- **local-pr-review** reviews a pull request locally and posts the findings as a GitHub App bot, so the author has to resolve each thread.
- **pr-description** writes PR titles and descriptions with the same sections every time, reporting only checks that actually ran.
- **bash-scripting** writes scripts as small functions and validates them with ShellCheck and shfmt.
- **skill-maintainer** creates and tests skills, including a trigger test against the real Claude Code CLI.

## The tradeoffs that mattered

**Evidence over confidence.** The review skills only report a finding with a concrete failing case, and a second, independent pass has to agree. Fewer findings, but people stop ignoring them.

**No dependencies.** The helper scripts need only Node.js, so installing a skill never pulls in a package tree.

## Where it stands

Every repository I maintain uses these skills before each commit and on each pull request. Install one with `npx skills@latest add winmetta/agent-skills --skill <name>`.
