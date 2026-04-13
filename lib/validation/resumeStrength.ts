import { z } from 'zod';

export const resumeStrengthSchema = z.object({
  resume: z.string().min(100, 'Resume must be at least 100 characters').max(15000),
});

export type ResumeStrengthInput = z.infer<typeof resumeStrengthSchema>;
