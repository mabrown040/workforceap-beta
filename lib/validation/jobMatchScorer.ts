import { z } from 'zod';

export const jobMatchScorerSchema = z.object({
  resume: z.string().min(100, 'Resume must be at least 100 characters').max(15000),
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters').max(8000),
});

export type JobMatchScorerInput = z.infer<typeof jobMatchScorerSchema>;
