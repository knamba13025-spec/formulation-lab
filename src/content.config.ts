import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['skincare', 'supplement', 'clinic', 'science', 'science-news']),
    grade: z.enum(['A', 'B', 'C', 'D']).optional(),
    affiliate: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
