import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Status words are shown to visitors as-is; keep them honest (see AGENTS.md).
export const statuses = [
  'available',
  'in development',
  'planned',
  'historical',
] as const;

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    // One line, shown in lists. Plain text.
    summary: z.string(),
    status: z.enum(statuses),
    // What I did on it, in a few words ("author", "tech lead and maintainer").
    role: z.string(),
    owner: z.enum(['ninegene', 'winmetta', 'learnburmese']),
    stack: z.array(z.string()).default([]),
    period: z.string(),
    // Public site people can use. Omit when nothing is live.
    siteUrl: z.url().optional(),
    // Public source. Omit for private repositories.
    repoUrl: z.url().optional(),
    featured: z.boolean().default(false),
    // Lower numbers come first within a group.
    order: z.number().default(100),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // Drafts are built only by `astro dev`, never published.
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, notes };
