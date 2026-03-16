import { z } from 'zod';

export const salaryNegotiationSchema = z.object({
  currentOffer: z.coerce.number().min(1, 'Current offer is required').max(10_000_000),
  targetSalary: z.coerce.number().min(1, 'Target salary is required').max(10_000_000),
  jobTitle: z.string().min(2, 'Job title is required').max(200),
  companyName: z.string().min(1, 'Company name is required').max(200),
  deliveryMethod: z.enum(['phone', 'email']),
});

export type SalaryNegotiationInput = z.infer<typeof salaryNegotiationSchema>;
