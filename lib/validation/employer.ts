import { z } from 'zod';

export const employerSignupSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be less than 200 characters')
    .trim(),
  contactName: z
    .string()
    .min(1, 'Contact name is required')
    .max(200, 'Contact name must be less than 200 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .max(20)
    .regex(/^[\d\s\-\(\)\.\+]+$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  industry: z
    .string()
    .max(120, 'Industry must be less than 120 characters')
    .optional()
    .or(z.literal('')),
  companySize: z
    .string()
    .max(40, 'Company size must be less than 40 characters')
    .optional()
    .or(z.literal('')),
  rolesHiring: z
    .string()
    .max(2000, 'Must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  hearAbout: z
    .string()
    .max(200, 'Must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and privacy policy' }),
  }),
  /** Cloudflare Turnstile token, verified server-side when NEXT_PUBLIC_CAPTCHA_ENABLED=true. */
  turnstileToken: z.string().optional().nullable(),
});

export type EmployerSignupInput = z.infer<typeof employerSignupSchema>;
