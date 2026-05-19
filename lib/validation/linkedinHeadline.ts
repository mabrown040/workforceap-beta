import { z } from 'zod';

export const linkedinHeadlineSchema = z.object({
  role: z.string().min(2, 'Role is required').max(100).optional(),
  keySkills: z.string().min(2, 'Add at least one skill').max(500).optional(),
  yearsExperience: z.string().max(50).optional(),
  prefill: z.boolean().optional(),
  subjectMemberId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export type LinkedInHeadlineInput = z.infer<typeof linkedinHeadlineSchema>;
