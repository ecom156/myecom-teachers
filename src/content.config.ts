import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    // /teachers/ からの相対パス（トップページは空文字）
    path: z.string(),
    order: z.number().default(0),
    // 本文の <!-- form --> の位置に差し込むフォーム
    form: z.enum(['apply', 'contact']).optional(),
    description: z.string().optional(),
  }),
});

export const collections = { pages };
