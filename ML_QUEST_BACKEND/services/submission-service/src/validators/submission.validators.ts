import { z } from 'zod';

export const SubmitCodeSchema = z.object({
  problemId: z.string().uuid('Invalid problem ID'),
  code: z.string().min(1, 'Code cannot be empty').max(50000, 'Code exceeds maximum length'),
  language: z.enum(['python', 'javascript', 'java', 'cpp', 'go', 'rust'], {
    errorMap: () => ({ message: 'Unsupported programming language' }),
  }),
  isRunOnly: z.boolean().optional(),
});

export type SubmitCodeDto = z.infer<typeof SubmitCodeSchema>;

export const GetSubmissionsSchema = z.object({
  problemId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type GetSubmissionsDto = z.infer<typeof GetSubmissionsSchema>;
