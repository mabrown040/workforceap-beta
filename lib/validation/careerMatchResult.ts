import { z } from 'zod';

export const careerMatchResultSchema = z.object({
  topOccupations: z.array(
    z.object({
      onetCode: z.string(),
      title: z.string(),
      description: z.string(),
      confidence: z.number(),
      whyFit: z.array(z.string()),
      commonTasks: z.array(z.string()),
      skills: z.array(z.string()),
      relatedRoles: z.array(z.string()),
    })
  ),
  recommendedPrograms: z.array(
    z.object({
      programSlug: z.string(),
      priority: z.number(),
      recommendationType: z.enum(['primary', 'bridge', 'stretch']),
      whyRecommended: z.string(),
    })
  ),
  experienceBand: z.enum(['beginner', 'some_experience', 'experienced']),
  supportFlags: z.object({
    needsComputerSupport: z.boolean(),
  }),
});

export const careerMatchResultNullableSchema = careerMatchResultSchema.nullable();

export type CareerMatchResultInput = z.input<typeof careerMatchResultSchema>;
