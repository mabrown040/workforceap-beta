import { z } from 'zod';

export const interviewResponseSchema = z.object({
  question: z.string(),
  type: z.string(),
  category: z.string(),
});

export const interviewStartResponseSchema = z.object({
  opening: z.string(),
  question: z.string(),
  type: z.string(),
  category: z.string(),
});

const categorySchema = z.object({
  name: z.string(),
  score: z.number(),
  feedback: z.string(),
});

export const interviewResultsResponseSchema = z.object({
  overallScore: z.number(),
  categories: z.array(categorySchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  summary: z.string(),
});
