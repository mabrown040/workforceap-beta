import { z } from 'zod';

export const linkedinAboutSchema = z.object({
  role: z.string().min(2, 'Role is required').max(200),
  bullets: z.string().min(50, 'Provide at least 3-5 bullet points about yourself').max(3000),
});

export type LinkedInAboutInput = z.infer<typeof linkedinAboutSchema>;
