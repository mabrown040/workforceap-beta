import { z } from 'zod';

export const interviewCategorySchema = z.enum([
  'communication',
  'leadership',
  'problem_solving',
  'teamwork',
  'adaptability',
]);

export const interviewStartResponseSchema = z.object({
  opening: z.string().min(1),
  question: z.string().min(1),
  type: z.literal('behavioral'),
  category: interviewCategorySchema,
});

export const interviewResponseSchema = z.object({
  question: z.string().min(1),
  type: z.literal('behavioral'),
  category: interviewCategorySchema,
});

export const interviewResultsCategorySchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(0).max(100),
  feedback: z.string().min(1),
});

export const interviewResultsResponseSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  categories: z.array(interviewResultsCategorySchema),
  strengths: z.array(z.string().min(1)),
  improvements: z.array(z.string().min(1)),
  summary: z.string().min(1),
});

export const goalStepsArraySchema = z.array(z.string().min(1)).min(3).max(5);

export type InterviewStartResponse = z.infer<typeof interviewStartResponseSchema>;
export type InterviewResponse = z.infer<typeof interviewResponseSchema>;
export type InterviewResultsResponse = z.infer<typeof interviewResultsResponseSchema>;
export type InterviewCategory = z.infer<typeof interviewCategorySchema>;
