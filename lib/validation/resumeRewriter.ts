import { z } from 'zod';

export const resumeRewriterSchema = z.object({
  resume: z.string().min(50, 'Resume must be at least 50 characters').max(15000, 'Resume must be under 15,000 characters'),
  jobTarget: z.string().min(5, 'Job target is required').max(500, 'Job target must be under 500 characters'),
  targetSalary: z.string().max(100).optional(),
  targetLocation: z.string().max(200).optional(),
  language: z.enum(['en', 'es', 'fr', 'pt']).optional().default('en'),
  /** Counselor/admin In-Office Session: run on behalf of this member. */
  subjectMemberId: z.string().uuid().optional(),
  /** Group multiple tool runs into one session. */
  sessionId: z.string().uuid().optional(),
  /** early_career | career_transition | experienced — or auto from profile when omitted. */
  resumeFramework: z.enum(['auto', 'early_career', 'career_transition', 'experienced']).optional().default('auto'),
});

export type ResumeRewriterInput = z.infer<typeof resumeRewriterSchema>;