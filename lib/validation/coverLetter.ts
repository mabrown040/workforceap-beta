import { z } from 'zod';

export const coverLetterSchema = z
  .object({
    // Resume is optional at the schema level — the route can either receive a
    // resume directly or set `prefill: true` to pull from member state.
    resume: z
      .string()
      .min(50, 'Resume/experience must be at least 50 characters')
      .max(15000)
      .optional(),
    jobDescription: z.string().min(20, 'Job description is required').max(5000),
    companyName: z.string().min(1, 'Company name is required').max(200).optional().default('the company'),
    tone: z.enum(['formal', 'confident', 'conversational']).optional().default('formal'),
    /** If true and resume is missing, prefill from member state. */
    prefill: z.boolean().optional(),
    /** Counselor/admin In-Office Session: run on behalf of this member. */
    subjectMemberId: z.string().uuid().optional(),
    /** Group multiple tool runs into one session. */
    sessionId: z.string().uuid().optional(),
    /** Sprint R2: thread this run back to a prior result for "regenerate with a different angle". */
    parentToolResultId: z.string().uuid().optional(),
  })
  .refine((data) => Boolean(data.resume) || data.prefill === true, {
    message:
      'Paste your resume/experience or set prefill: true to use your saved resume.',
    path: ['resume'],
  });

export type CoverLetterInput = z.infer<typeof coverLetterSchema>;
