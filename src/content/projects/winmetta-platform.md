---
title: Win Metta Platform
summary: A bilingual Burmese and English site where students of a Buddhist teaching community find classes, a library of about 3,000 books, and short teachings in three languages.
status: available
role: Tech lead and main developer (volunteer)
owner: winmetta
stack: [Astro, React, TypeScript, Pulumi, AWS S3, CloudFront, GitHub Actions]
period: 2026–
siteUrl: https://app.winmetta.org
repoUrl: https://github.com/winmetta/winmetta-platform
featured: true
order: 1
---

## Who needed help

Win Metta is a small California nonprofit that continues a Burmese Theravāda Buddhist teaching community online. Its students and readers are spread around the world, and its library of about 3,000 PDF books, mostly in Burmese, sat in a storage bucket that people could only browse by folder names. Most readers type Burmese words and don't know a book's exact title or author.

## What I built

- One bilingual place, in English and Burmese, for the class schedule, teachers, study groups, retreats and Zoom help.
- A Dhamma Library over the whole PDF collection. A script lists the bucket and writes a committed manifest, so builds never need cloud credentials. Folders become tags, and search is fuzzy, with Burmese-aware normalization so near spellings still match.
- Dhamma Posts: short teachings, each in Burmese, English and Simplified Chinese, kept as Markdown in the repository so volunteers can edit them through pull requests.
- Hosting as code: a private S3 bucket behind CloudFront, certificates and DNS, all in one Pulumi program, deployed by GitHub Actions with short-lived OIDC credentials instead of stored keys.

## The tradeoffs that mattered

**Static first.** A volunteer team cannot babysit servers. Everything a visitor reads is pre-rendered at build time, so there is no backend or database to patch, and hosting costs stay around a dollar a month.

**One language for the app and the infrastructure.** Pulumi in TypeScript means the same editor setup, type checker and review habits for the site and its hosting, which matters when the next maintainer may be a volunteer.

**Link out instead of rebuilding.** Full scripture search is already done well by existing reader apps, so the site links to them rather than competing.

## Where it stands

The site is live as a beta at app.winmetta.org. The next big piece is turning an existing Burmese literacy course into interactive, self-paced lessons.
