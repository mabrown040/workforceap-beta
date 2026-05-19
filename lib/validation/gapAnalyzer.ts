import { z } from 'zod';

export const gapAnalyzerSchema = z.object({
  resume: z.string().min(100, 'Resume must be at least 100 characters').max(15000).optional(),
  prefill: z.boolean().optional(),
  subjectMemberId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export type GapAnalyzerInput = z.infer<typeof gapAnalyzerSchema>;
