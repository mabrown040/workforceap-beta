import { z } from 'zod';

export const PROGRAM_INTEREST_OPTIONS = [
  'Digital Literacy Empowerment Class (6 weeks, 30 hours total)',
  'AI Practitioner Professional Certificate',
  'AI and Software Development Professional Certificate (IBM)',
  'Software Developer Professional Certificate (IBM)',
  'CompTIA A+ Professional Certificate',
  'CompTIA Network+ Professional Certificate',
  'CompTIA Security+ Professional Certificate',
  'Cyber Security and Networking Professional Certificate (Network+, Sec+)',
  'IT Support and Entry-level Cyber Security Certificate',
  'IT Automation with Python Professional Certificate (Google)',
  'IT Support Professional Certificate (IBM)',
  'AWS Cloud Technology Certificate',
  'Data Analytics Professional Certificate (Google)',
  'Data Science Professional Certificate (IBM)',
  'Digital Marketing & E-Commerce (Google)',
  'Project Management Professional Certificate (Microsoft)',
  'UX Design Professional Certificate (Google)',
  'Medical Billing, Coding, and Health Information Technology',
  'Certified Production Technician (CPT)',
  'Certified Logistics Technician (CLT)',
  'Core Construction',
  'Not sure — help me choose',
] as const;

const optionalTrimmedString = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }, schema.optional());

export const memberSignupSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be less than 120 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: optionalTrimmedString(
    z
      .string()
      .min(10, 'Please enter a valid phone number')
      .max(20)
      .regex(/^[\d\s\-\(\)\+\.]+$/, 'Please enter a valid phone number')
  ),
  zip: optionalTrimmedString(
    z
      .string()
      .min(5, 'Please enter a valid ZIP code')
      .max(10)
      .regex(/^\d{5}(-\d{4})?$/, 'Please enter a valid ZIP code (e.g. 78701 or 78701-1234)')
  ),
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
  /** Partner referral code from apply link (?ref=), stored on Application */
  referralRef: z.string().max(100).optional().nullable(),
  /** Marketing attribution captured at first ad-landing visit. Stored on
   * downstream MemberEvent metadata for paid-channel ROI analysis. */
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  utmContent: z.string().max(200).optional().nullable(),
  utmTerm: z.string().max(200).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
});

export type MemberSignupInput = z.infer<typeof memberSignupSchema>;
