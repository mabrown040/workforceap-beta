import { z } from 'zod';

export const coverLetterSchema = z.object({
  resume: z.string().min(50, 'Resume/experience must be at least 50 characters').max(15000),
  jobDescription: z.string().min(20, 'Job description is required').max(5000),
  companyName: z.string().min(1, 'Company name is required').max(200).optional().default('the company'),
});

export type CoverLetterInput = z.infer<typeof coverLetterSchema>;
