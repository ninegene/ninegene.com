---
title: bootstrap-dev-env
summary: One command to set up a development machine with mise, shared git, shell and editor settings, safe to run again and again.
status: available
role: Author and maintainer
owner: winmetta
stack: [Bash, mise]
period: 2026–
repoUrl: https://github.com/winmetta/bootstrap-dev-env
featured: true
order: 3
---

## Who needed help

Setting up a development machine by hand takes hours, and every machine ends up slightly different, so the same command behaves one way on a Mac and another on Linux. I wanted one setup I could hand to volunteers and new developers.

## What I built

A Bash script that installs the mise tool manager and, through it, the same command-line tools everywhere, including GNU coreutils, sed and grep on macOS so commands behave like they do on Linux. It sets shared git, shell prompt and vim settings, and asks before replacing anything you already have.

## The tradeoffs that mattered

**Re-runnable over clever.** Each step checks what is already there, so running it twice is safe and running it again is how you update.

**Keep going, then report.** If one tool fails to install, the script continues and lists every failure with a manual fix at the end, instead of stopping at the first problem and leaving a half-set-up machine.

**One file per platform.** macOS works today; Linux and Windows will each be one new file without touching the shared steps.

## Where it stands

macOS is supported. Linux and Windows are planned.
