import { z } from 'zod';

export const linkedinAboutSchema = z.object({
  role: z.string().min(2, 'Role is required').max(200).optional(),
  /** Highlights / bullets; can be shorter when resume context is attached server-side */
  bullets: z.string().min(20, 'Add a few points about yourself (or use text loaded from your resume)').max(3000).optional(),
  prefill: z.boolean().optional(),
  subjectMemberId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export type LinkedInAboutInput = z.infer<typeof linkedinAboutSchema>;
