import { z } from 'zod';

export const coverLetterSchema = z.object({
  resume: z.string().min(50, 'Resume/experience must be at least 50 characters').max(15000),
  jobDescription: z.string().min(20, 'Job description is required').max(5000),
  companyName: z.string().min(1, 'Company name is required').max(200).optional().default('the company'),
  tone: z.enum(['formal', 'confident', 'conversational']).optional().default('formal'),
  /** Counselor/admin In-Office Session: run on behalf of this member. */
  subjectMemberId: z.string().uuid().optional(),
  /** Group multiple tool runs into one session. */
  sessionId: z.string().uuid().optional(),
});

export type CoverLetterInput = z.infer<typeof coverLetterSchema>;
