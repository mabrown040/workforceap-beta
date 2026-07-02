/**
 * Employer role-example cards — shared by /employers outcomes section.
 * These are example roles WorkforceAP supports, not verified testimonials.
 * Replace with real partner quotes and verified outcomes when approved.
 */

export type EmployerCaseStudy = {
  company: string;
  industry: string;
  location: string;
  outcome_summary: string;
  role_filled: string;
  /** Factual description of how WorkforceAP supports this role type. No fake quotes. */
  quote: string;
  /** Attribution only used when quote is a real, verified testimonial. */
  attribution_name: string;
  attribution_title: string;
};

export const EMPLOYER_CASE_STUDIES: EmployerCaseStudy[] = [
  {
    company: 'Example: IT services partner',
    industry: 'IT Services',
    location: 'Central Texas',
    outcome_summary: 'Helpdesk and junior network support roles',
    role_filled: 'Helpdesk + junior network support',
    quote:
      'WorkforceAP members complete structured training in IT support, hardware, operating systems, and networking before interview introductions. Typical roles include helpdesk technician, junior network support, and technical support specialist.',
    attribution_name: '',
    attribution_title: '',
  },
  {
    company: 'Example: Operations hiring partner',
    industry: 'Logistics',
    location: 'Texas',
    outcome_summary: 'Coordinator and operations support roles',
    role_filled: 'Dispatch + operations coordinator',
    quote:
      'Members are screened for scheduling fit, communication skills, and readiness before introduction. Typical roles include dispatch coordinator, inventory clerk, and operations support.',
    attribution_name: '',
    attribution_title: '',
  },
  {
    company: 'Example: Healthcare support partner',
    industry: 'Healthcare',
    location: 'Texas',
    outcome_summary: 'IT support and patient coordination pathways',
    role_filled: 'IT support + patient coordination',
    quote:
      'Medical billing, health information, and IT Support pathways prepare members for administrative healthcare IT roles and patient coordination positions. Members complete HIPAA-aware training and medical coding fundamentals.',
    attribution_name: '',
    attribution_title: '',
  },
];
