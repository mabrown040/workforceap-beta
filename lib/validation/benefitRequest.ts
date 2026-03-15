import { z } from 'zod';

export const BENEFITS = ['linkedin_premium', 'coursera'] as const;

export const benefitRequestSchema = z.object({
  benefit: z.enum(BENEFITS),
});

export type BenefitRequestInput = z.infer<typeof benefitRequestSchema>;
