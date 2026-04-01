import { z } from 'zod';

const radarAxisSchema = z.object({
  axis: z.string().min(1).max(80),
  value: z.number().min(0).max(100),
  maxValue: z.number().min(1).max(100),
});

const skillSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(200),
  score: z.number().min(0).max(100),
  category: z.enum(['skill', 'knowledge', 'ability', 'technology']),
});

export const saveSkillAssessmentSchema = z.object({
  occupationTitle: z.string().trim().min(1).max(200),
  occupationCode: z.string().trim().min(1).max(40),
  radarAxes: z.array(radarAxisSchema).min(1).max(6),
  skills: z.array(skillSchema).min(1).max(20),
});
