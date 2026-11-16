import { getCollection, type CollectionEntry } from 'astro:content';

const byOrder = (
  a: CollectionEntry<'projects'>,
  b: CollectionEntry<'projects'>,
) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title);

export async function getProjects() {
  return (await getCollection('projects')).sort(byOrder);
}

// Drafts show up in `astro dev` only.
export async function getNotes() {
  const notes = await getCollection(
    'notes',
    (note) => import.meta.env.DEV || !note.data.draft,
  );
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
