import { z } from 'zod';

const optionalNonEmptyString = (schema: z.ZodString) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    schema.optional()
  );

export const jobMatchScorerSchema = z.object({
  resume: z.string().min(100, 'Resume must be at least 100 characters').max(15000),
  jobDescription: optionalNonEmptyString(
    z.string().min(50, 'Job description must be at least 50 characters').max(8000)
  ),
  jobUrl: optionalNonEmptyString(
    z.string().url('Please enter a valid URL')
  ),
});

export type JobMatchScorerInput = z.infer<typeof jobMatchScorerSchema>;
