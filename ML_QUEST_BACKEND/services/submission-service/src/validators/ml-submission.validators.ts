import { z } from 'zod';
import { MLTaskType } from '../ml/types';

export const MLSubmitCodeSchema = z.object({
    code: z.string().min(1, 'Code is required').max(100_000, 'Code too large (max 100KB)'),
    problemId: z.string().optional(),          // accepts 'ml-001', slugs, or UUIDs
    taskTypeHint: z.nativeEnum(MLTaskType).optional(),
});

export const GetMLSubmissionsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export type MLSubmitCodeInput = z.infer<typeof MLSubmitCodeSchema>;
export type GetMLSubmissionsInput = z.infer<typeof GetMLSubmissionsSchema>;
