import { z } from 'zod';

export const linkedinHeadlineSchema = z.object({
  role: z.string().min(2, 'Role is required').max(100),
  keySkills: z.string().min(2, 'Add at least one skill').max(500),
  yearsExperience: z.string().max(50).optional(),
});

export type LinkedInHeadlineInput = z.infer<typeof linkedinHeadlineSchema>;
