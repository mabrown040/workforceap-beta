import { z } from 'zod';

export const interviewPracticeSchema = z.object({
  role: z.string().min(3, 'Role is required').max(200, 'Role must be under 200 characters'),
  experienceLevel: z.enum(['entry', 'mid', 'senior']).optional().default('mid'),
  count: z.number().min(3).max(15).optional().default(8),
});

export type InterviewPracticeInput = z.infer<typeof interviewPracticeSchema>;
