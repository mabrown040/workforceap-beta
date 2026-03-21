import { z } from 'zod';

export const PROGRAM_INTEREST_OPTIONS = [
  'Digital Literacy Empowerment Class (6-7 Weeks)',
  'AI Professional Developer Certificate (IBM)',
  'Software & Applications Developer (IBM)',
  'CompTIA A+ Professional Certificate',
  'CompTIA Network+ Professional Certificate',
  'CompTIA Security+ Professional Certificate',
  'Cybersecurity Professional Certificate (Google)',
  'IT Automation with Python (Google)',
  'IT Support Professional Certificate (IBM)',
  'AWS Cloud Technology (Amazon)',
  'Data Analytics Professional Certificate (Google)',
  'Data Science Professional Certificate (IBM)',
  'Digital Marketing & E-Commerce (Google)',
  'Project Management Professional Certificate (Microsoft)',
  'UX Design Professional Certificate (Google)',
  'Medical Coding & Health Information Technology (MCHIT)',
  'Certified Production Technician (CPT)',
  'Certified Logistics Technician (CLT)',
  'Core Construction Skilled Trades Readiness',
  'Not sure — help me choose',
] as const;

export const memberSignupSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be less than 120 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .max(20)
    .regex(/^[\d\s\-\(\)\+\.]+$/, 'Please enter a valid phone number')
    .trim(),
  zip: z
    .string()
    .min(5, 'Please enter a valid ZIP code')
    .max(10)
    .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (e.g. 78701 or 78701-1234)')
    .trim(),
  programInterest: z.enum(PROGRAM_INTEREST_OPTIONS, {
    errorMap: () => ({ message: 'Please select a program interest' }),
  }),
  employmentStatus: z.string().optional(),
  veteranStatus: z.string().optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  consentTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms and privacy policy' }),
  }),
  consentCommunications: z.boolean().optional(),
});

export type MemberSignupInput = z.infer<typeof memberSignupSchema>;
