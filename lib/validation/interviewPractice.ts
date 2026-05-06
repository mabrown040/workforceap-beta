import { z } from 'zod';

export const interviewPracticeSchema = z.object({
  role: z.string().min(3, 'Role is required').max(200, 'Role must be under 200 characters'),
  experienceLevel: z.enum(['entry', 'mid', 'senior']).optional().default('mid'),
  count: z.number().min(3).max(15).optional().default(8),
  /** Optional resume text so questions can reference real experience */
  resumeContext: z.string().max(15000).optional(),
  language: z.enum(['en', 'es', 'fr', 'pt']).optional().default('en'),
  /** Counselor/admin In-Office Session: run on behalf of this member. */
  subjectMemberId: z.string().uuid().optional(),
  /** Group multiple tool runs into one session. */
  sessionId: z.string().uuid().optional(),
});

export type InterviewPracticeInput = z.infer<typeof interviewPracticeSchema>;
