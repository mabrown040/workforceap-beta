import { z } from 'zod';

export const employerSettingsPatchSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  companyDescription: z.string().max(8000).optional().nullable(),
  companyWebsite: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .refine((v) => !v || v.trim() === '' || /^https?:\/\//i.test(v.trim()), {
      message: 'Website must start with http:// or https://',
    }),
  companySize: z.string().max(80).optional().nullable(),
  industry: z.string().max(120).optional().nullable(),
  contactName: z.string().trim().min(1).max(200),
  contactEmail: z.string().email().max(320).toLowerCase().trim(),
  contactPhone: z.string().max(50).optional().nullable(),
});

export type EmployerSettingsPatchInput = z.infer<typeof employerSettingsPatchSchema>;
