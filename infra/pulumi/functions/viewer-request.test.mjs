// Run from infra/pulumi: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Load the function the way CloudFront does: plain source text, no module system.
const source = fs.readFileSync(
  new URL('./viewer-request.js', import.meta.url),
  'utf8',
);
const handler = new Function(`${source}; return handler;`)();

const run = (uri, { host = 'ninegene.com', querystring = {} } = {}) =>
  handler({
    request: { uri, querystring, headers: { host: { value: host } } },
  });

test('the root maps to index.html', () => {
  assert.equal(run('/').uri, '/index.html');
});

test('a directory URL maps to its index.html', () => {
  assert.equal(run('/projects/').uri, '/projects/index.html');
  assert.equal(
    run('/projects/agent-skills/').uri,
    '/projects/agent-skills/index.html',
  );
});

test('a missing trailing slash redirects with 301 and keeps the query', () => {
  const response = run('/notes');
  assert.equal(response.statusCode, 301);
  assert.equal(response.headers.location.value, '/notes/');

  const withQuery = run('/notes', {
    querystring: {
      a: { value: '1' },
      t: { value: 'x', multiValue: [{ value: 'x' }, { value: 'y' }] },
    },
  });
  assert.equal(withQuery.headers.location.value, '/notes/?a=1&t=x&t=y');
});

test('files with an extension pass through unchanged', () => {
  for (const uri of [
    '/robots.txt',
    '/rss.xml',
    '/sitemap-index.xml',
    '/_astro/index.abc123.css',
    '/favicon.svg',
    '/404.html',
  ]) {
    assert.equal(run(uri).uri, uri);
  }
});

test('www redirects to the apex with the same path and query', () => {
  const response = run('/projects/', {
    host: 'www.ninegene.com',
    querystring: { q: { value: 'x' } },
  });
  assert.equal(response.statusCode, 301);
  assert.equal(
    response.headers.location.value,
    'https://ninegene.com/projects/?q=x',
  );
  assert.equal(
    run('/notes', { host: 'www.ninegene.com' }).headers.location.value,
    'https://ninegene.com/notes',
  );
});

test('a request with no host header is served normally', () => {
  const response = handler({
    request: { uri: '/', querystring: {}, headers: {} },
  });
  assert.equal(response.uri, '/index.html');
});
