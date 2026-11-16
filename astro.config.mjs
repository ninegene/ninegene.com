import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL is set by the deploy workflow; local builds use the production URL so
// canonical links and the sitemap are always absolute.
const site = process.env.SITE_URL ?? 'https://ninegene.com';

export default defineConfig({
  site,
  // Directory URLs (/projects/) map to index.html; the CloudFront viewer-request
  // function (infra/pulumi/functions/viewer-request.js) depends on this.
  trailingSlash: 'always',
  // Astro 7's HTML compression drops the space between a line of text and a link on
  // the next line ("lead at<a>"), so keep whitespace as written.
  compressHTML: false,
  build: { format: 'directory' },
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' } },
  },
});
