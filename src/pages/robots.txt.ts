import type { APIContext } from 'astro';

// PUBLIC_ALLOW_INDEXING=false (for example before launch) asks crawlers to stay away.
export function GET(context: APIContext) {
  const allow = import.meta.env.PUBLIC_ALLOW_INDEXING !== 'false';
  const sitemap = new URL('/sitemap-index.xml', context.site);
  const body = allow
    ? `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
