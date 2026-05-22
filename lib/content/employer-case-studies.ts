/**
 * Employer scenario cards — shared by /employers outcomes section.
 * Keep these anonymized until verified partner quotes and outcomes are approved.
 */

export type EmployerCaseStudy = {
  company: string;
  industry: string;
  location: string;
  outcome_summary: string;
  role_filled: string;
  quote: string;
  attribution_name: string;
  attribution_title: string;
};

export const EMPLOYER_CASE_STUDIES: EmployerCaseStudy[] = [
  {
    company: 'Regional IT services partner',
    industry: 'IT Services',
    location: 'Central Texas',
    outcome_summary: 'Helpdesk and junior network support roles',
    role_filled: 'Helpdesk + junior network support',
    quote:
      'WorkforceAP helps us focus interviews on candidates who have already completed structured technical training and readiness review.',
    attribution_name: 'Hiring partner',
    attribution_title: 'IT operations',
  },
  {
    company: 'Operations hiring partner',
    industry: 'Logistics',
    location: 'Texas',
    outcome_summary: 'Coordinator and operations support roles',
    role_filled: 'Dispatch + operations coordinator',
    quote:
      'The intake process gives us a clearer view of skills, schedule fit, and support needs before we commit interview time.',
    attribution_name: 'Hiring partner',
    attribution_title: 'Operations leadership',
  },
  {
    company: 'Healthcare support partner',
    industry: 'Healthcare',
    location: 'Texas',
    outcome_summary: 'IT support and patient coordination pathways',
    role_filled: 'IT support + patient coordination',
    quote:
      'We can review candidates against the requirements that matter to us, including readiness, communication, and role-specific training.',
    attribution_name: 'Hiring partner',
    attribution_title: 'People operations',
  },
];
