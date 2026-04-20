import { z } from 'zod';

export const AddTestCasesSchema = z.object({
  testCases: z.array(
    z.object({
      input: z.string().min(1, 'Input cannot be empty'),
      output: z.string().min(1, 'Output cannot be empty'),
      isSample: z.boolean().default(false),
    })
  ).min(1, 'At least one test case is required'),
});

export type AddTestCasesDto = z.infer<typeof AddTestCasesSchema>;
