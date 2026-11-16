import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getNotes } from '../lib/content';

export async function GET(context: APIContext) {
  const notes = (await getNotes()).filter((note) => !note.data.draft);
  return rss({
    title: 'Notes by ALO (Gene)',
    description:
      'Notes on building and running software, developer tooling, AI and teaching.',
    site: context.site ?? 'https://ninegene.com',
    trailingSlash: true,
    items: notes.map((note) => ({
      title: note.data.title,
      description: note.data.description,
      pubDate: note.data.date,
      link: `/notes/${note.id}/`,
      categories: note.data.tags,
    })),
  });
}
