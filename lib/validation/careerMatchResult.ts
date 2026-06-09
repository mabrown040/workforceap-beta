import { z } from 'zod';

const occupationSchema = z.object({
  title: z.string(),
  code: z.string().optional(),
  matchScore: z.number().optional(),
});

export const careerMatchResultSchema = z.object({
  topOccupations: z.array(occupationSchema).optional(),
  summary: z.string().optional(),
});

export const careerMatchResultNullableSchema = careerMatchResultSchema.nullable();
