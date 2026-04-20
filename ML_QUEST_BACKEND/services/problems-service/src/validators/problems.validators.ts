import { z } from 'zod';

export const CreateProblemSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  tags: z.array(z.string()).min(1).max(10),
  constraints: z.string().optional(),
  examples: z.array(
    z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().optional(),
    })
  ).min(1),
  isPremium: z.boolean().default(false),
});

export const ProblemFiltersSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.string().optional(),       // comma separated: "array,string"
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(20),
});

export type CreateProblemDto = z.infer<typeof CreateProblemSchema>;
export type ProblemFiltersDto = z.infer<typeof ProblemFiltersSchema>;
