import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(['skincare', 'supplement', 'clinic', 'science']),
    grade: z.enum(['A', 'B', 'C', 'D']).optional(),
    affiliate: z.boolean().default(true),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
