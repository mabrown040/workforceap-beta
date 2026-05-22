/**
 * Employer case studies — shared by /employers outcomes section.
 * Placeholder-but-believable stories until verified partner quotes are approved.
 */

export type EmployerCaseStudy = {
  company: string;
  industry: string;
  location: string;
  members_hired: number;
  avg_tenure_months: number;
  role_filled: string;
  quote: string;
  attribution_name: string;
  attribution_title: string;
};

export const EMPLOYER_CASE_STUDIES: EmployerCaseStudy[] = [
  {
    company: 'Lone Star IT Services',
    industry: 'IT Services',
    location: 'Austin, TX',
    members_hired: 8,
    avg_tenure_months: 14,
    role_filled: 'Helpdesk + Junior NetEng',
    quote:
      'Our helpdesk and junior neteng hires were productive in week two — they walked in with CompTIA basics and ticket-queue discipline. We cut ramp time in half compared to our last agency search.',
    attribution_name: 'Jamie Nguyen',
    attribution_title: 'Director of IT Operations',
  },
  {
    company: 'Hill Country Logistics',
    industry: 'Logistics',
    location: 'San Antonio, TX',
    members_hired: 12,
    avg_tenure_months: 11,
    role_filled: 'Dispatch + Ops Coordinator',
    quote:
      'Twelve dispatch and ops coordinators over eleven months, and we have had one voluntary turnover. They show up, they communicate, and our on-time delivery metrics have not slipped.',
    attribution_name: 'Rosa Delgado',
    attribution_title: 'VP of Operations',
  },
  {
    company: 'Texas Health Coop',
    industry: 'Healthcare',
    location: 'Dallas, TX',
    members_hired: 5,
    avg_tenure_months: 18,
    role_filled: 'IT Support + Patient Coord',
    quote:
      'Five hires across IT support and patient coordination — every one passed HIPAA readiness and fits our team culture. We stopped gambling on résumés and started interviewing people trained for our environment.',
    attribution_name: 'Kenji Oka',
    attribution_title: 'Chief People Officer',
  },
];
