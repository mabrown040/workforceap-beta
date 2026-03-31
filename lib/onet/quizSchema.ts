import { z } from 'zod';

/** Validates POST body for /api/careers/recommend — mirrors QuizAnswers in quizScoring.ts */
export const quizAnswersSchema = z.object({
  q1: z.enum(['computers', 'health', 'building', 'managing', 'data', 'not_sure']),
  q2: z.enum(['brand_new', 'some_knowledge', 'work_experience', 'certifications']),
  q3: z.enum(['as_fast', '3_5_months', 'planning_ahead', 'employed_switch']),
  q4: z.enum(['salary', 'stability', 'remote', 'community', 'hands']),
  q5: z.enum(['comfortable', 'basic_apps', 'tech_savvy', 'basics']),
  q6: z.enum(['yes_computer', 'no_computer', 'needs_device']),
});

export type QuizAnswersInput = z.infer<typeof quizAnswersSchema>;
