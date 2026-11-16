// Run from the repository root: node --test scripts/check-versions.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compare,
  majorOf,
  miseTool,
  newestLts,
  report,
} from './check-versions.mjs';

const latest = {
  node: { version: 'v26.13.1', codename: 'Lithium' },
  pulumi: 'v3.276.0',
};
const files = (node, engines, types, pulumi) => ({
  mise: `[tools]\nnode = "${node}"\npulumi = "${pulumi}"\n`,
  site: { engines: { node: engines } },
  infra: {
    engines: { node: engines },
    devDependencies: { '@types/node': types },
  },
});

test('majorOf reads the first number of a version or range', () => {
  assert.equal(majorOf('24'), 24);
  assert.equal(majorOf('>=24 <25'), 24);
  assert.equal(majorOf('^26.6.6'), 26);
  assert.equal(majorOf(undefined), null);
});

test('miseTool reads a quoted tool version', () => {
  assert.equal(miseTool('[tools]\nnode = "26"\n', 'node'), '26');
  assert.equal(miseTool('[tools]\nnodejs = "26"\n', 'node'), null);
});

test('newestLts skips newer releases that are not LTS', () => {
  const index = [
    { version: 'v27.0.0', lts: false },
    { version: 'v26.13.1', lts: 'Lithium' },
    { version: 'v24.22.3', lts: 'Krypton' },
  ];
  assert.deepEqual(newestLts(index), {
    version: 'v26.13.1',
    codename: 'Lithium',
  });
  assert.throws(() => newestLts([{ version: 'v27.0.0', lts: false }]));
});

test('everything on the newest LTS and Pulumi release is current', () => {
  const rows = compare(files('26', '>=26 <27', '^26.6.6', '3.276.0'), latest);
  assert.ok(rows.every((row) => row.ok));
  assert.match(report(rows, '2026-11-16'), /All checked versions are current/);
});

test('an older Node major and Pulumi release are reported as behind', () => {
  const rows = compare(files('24', '>=24 <25', '^24.19.2', '3.275.0'), latest);
  assert.equal(rows.filter((row) => !row.ok).length, 5);
  assert.match(report(rows, '2026-11-16'), /5 pinned version\(s\) are behind/);
});

test('a missing pin is reported, not skipped', () => {
  const rows = compare({ mise: '[tools]\n', site: {}, infra: {} }, latest);
  assert.ok(rows.every((row) => !row.ok && row.current === '(missing)'));
});
