import { z } from 'zod';

export const resumeRewriterSchema = z.object({
  resume: z.string().min(50, 'Resume must be at least 50 characters').max(15000, 'Resume must be under 15,000 characters'),
  jobTarget: z.string().min(5, 'Job target is required').max(500, 'Job target must be under 500 characters'),
});

export type ResumeRewriterInput = z.infer<typeof resumeRewriterSchema>;
