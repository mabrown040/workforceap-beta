/**
 * Shared 19-program list — same source as /programs page.
 * Used for assessment dropdown and program interest selection.
 */
export const PROGRAM_TITLES = [
  'Digital Literacy Empowerment Class',
  'AI Professional Developer Certificate (IBM)',
  'AWS Cloud Technology (Amazon)',
  'CompTIA A+ Professional Certificate',
  'CompTIA Network+ Professional Certificate',
  'CompTIA Security+ Professional Certificate',
  'Cybersecurity Professional Certificate (Google)',
  'Data Analytics Professional Certificate (Google)',
  'Data Science Professional Certificate (IBM)',
  'Project Management Professional Certificate (Microsoft)',
  'Digital Marketing & E-Commerce (Google)',
  'UX Design Professional Certificate (Google)',
  'IT Support Professional Certificate (IBM)',
  'IT Automation with Python (Google)',
  'Health Information Technology (MCHIT)',
  'Production Technology Certificate (CPT)',
  'Logistics and Supply Chain Certificate (CLT)',
  'Construction Readiness Certificate (OSHA-10)',
  'Software Developer Professional Certificate (IBM)',
] as const;

export type ProgramTitle = (typeof PROGRAM_TITLES)[number];
