#!/usr/bin/env node
// Checks the versions Dependabot can't update: Node.js (mise.toml, both
// package.json engines, @types/node) against the newest Node.js LTS, and the
// Pulumi CLI in mise.toml against Pulumi's latest release.
//
// Prints a Markdown report on stdout. Exit codes: 0 all current, 1 something is
// behind, 2 a lookup failed. Set GITHUB_TOKEN to avoid GitHub API rate limits.
//
// Usage: node scripts/check-versions.mjs
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const NODE_INDEX = 'https://nodejs.org/dist/index.json';
const PULUMI_RELEASE =
  'https://api.github.com/repos/pulumi/pulumi/releases/latest';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const readJson = (path) => JSON.parse(read(path));

// The first whole number in a version or range: "24" -> 24, ">=24 <25" -> 24,
// "^24.19.2" -> 24. Returns null when there is none.
export function majorOf(value) {
  const match = /\d+/.exec(value ?? '');
  return match ? Number(match[0]) : null;
}

// Reads `tool = "value"` from the [tools] table of mise.toml.
export function miseTool(toml, tool) {
  const match = new RegExp(`^\\s*${tool}\\s*=\\s*"([^"]+)"`, 'm').exec(toml);
  return match ? match[1] : null;
}

// The newest LTS release in nodejs.org/dist/index.json (newest first).
export function newestLts(index) {
  const release = index.find((r) => r.lts);
  if (!release) throw new Error('no LTS release in the Node.js index');
  return { version: release.version, codename: release.lts };
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: { 'user-agent': 'ninegene.com-version-check', ...headers },
  });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

// Builds one row per pinned version. `latest` holds the looked-up versions.
export function compare(files, latest) {
  const ltsMajor = majorOf(latest.node.version);
  const nodeRow = (where, current) => ({
    item: 'Node.js',
    where,
    current: current ?? '(missing)',
    latest: `${latest.node.version} (LTS ${latest.node.codename})`,
    ok: majorOf(current) === ltsMajor,
  });
  const pulumi = miseTool(files.mise, 'pulumi');
  const latestPulumi = latest.pulumi.replace(/^v/, '');
  return [
    nodeRow('mise.toml', miseTool(files.mise, 'node')),
    nodeRow('package.json engines', files.site.engines?.node),
    nodeRow('infra/pulumi/package.json engines', files.infra.engines?.node),
    nodeRow(
      'infra/pulumi/package.json @types/node',
      files.infra.devDependencies?.['@types/node'],
    ),
    {
      item: 'Pulumi CLI',
      where: 'mise.toml',
      current: pulumi ?? '(missing)',
      latest: latestPulumi,
      ok: pulumi === latestPulumi,
    },
  ];
}

export function report(rows, date) {
  const behind = rows.filter((row) => !row.ok);
  const lines = [
    behind.length
      ? `${behind.length} pinned version(s) are behind.`
      : 'All checked versions are current.',
    '',
    '| Item | File | Pinned | Latest | Status |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.item} | \`${r.where}\` | \`${r.current}\` | \`${r.latest}\` | ${r.ok ? 'current' : '**behind**'} |`,
    ),
    '',
    `Checked ${date} by \`scripts/check-versions.mjs\` against ${NODE_INDEX} (newest LTS) and the latest release of pulumi/pulumi. npm packages and GitHub Actions are updated by Dependabot.`,
  ];
  return lines.join('\n');
}

async function main() {
  const files = {
    mise: read('mise.toml'),
    site: readJson('package.json'),
    infra: readJson('infra/pulumi/package.json'),
  };
  const githubHeaders = process.env.GITHUB_TOKEN
    ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
  let latest;
  try {
    const [index, release] = await Promise.all([
      fetchJson(NODE_INDEX),
      fetchJson(PULUMI_RELEASE, githubHeaders),
    ]);
    latest = { node: newestLts(index), pulumi: release.tag_name };
  } catch (error) {
    console.error(`Version lookup failed: ${error.message}`);
    process.exit(2);
  }
  const rows = compare(files, latest);
  console.log(report(rows, new Date().toISOString().slice(0, 10)));
  process.exit(rows.every((row) => row.ok) ? 0 : 1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main();
}
