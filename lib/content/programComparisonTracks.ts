/**
 * Featured comparison tracks — slugs tie to lib/content/programs.ts.
 * Salary + duration come from the canonical program record so numbers match /programs.
 */

import { getProgramBySlug } from './programs';
import type { Program } from './programs';
import { getProgramExtra } from './programExtras';
import { salaryRangeDisplay } from './programSalaryOutcomes';

export type ComparisonTrack = {
  /** Short label for dense tables */
  shortName: string;
  slug: string;
  duration: string;
  difficulty: string;
  salary: string;
  demand: 'High' | 'Very High';
  certs: string;
};

const FEATURED: { slug: string; shortName: string; demand: 'High' | 'Very High'; certs: string }[] = [
  {
    slug: 'it-support-professional-certificate-ibm',
    shortName: 'IT Support',
    demand: 'High',
    certs: 'CompTIA-ready, IBM IT Support',
  },
  {
    slug: 'cybersecurity-professional-certificate-google',
    shortName: 'Cybersecurity',
    demand: 'Very High',
    certs: 'Google Cyber, Security+ path',
  },
  {
    slug: 'aws-cloud-technology-amazon',
    shortName: 'Cloud (AWS)',
    demand: 'Very High',
    certs: 'AWS-focused professional cert path',
  },
  {
    slug: 'data-analytics-professional-certificate-google',
    shortName: 'Data Analytics',
    demand: 'Very High',
    certs: 'Google Data Analytics',
  },
  {
    slug: 'project-management-professional-certificate-microsoft',
    shortName: 'Project Management',
    demand: 'High',
    certs: 'PM foundations, Agile / Scrum',
  },
  {
    slug: 'digital-literacy-empowerment-class',
    shortName: 'Digital Literacy',
    demand: 'High',
    certs: 'Foundational digital + IBM SkillsBuild',
  },
  {
    slug: 'health-information-technology-mchit',
    shortName: 'Medical Coding / HIT',
    demand: 'High',
    certs: 'ICD-10 / CPT, EHR fundamentals',
  },
  {
    slug: 'construction-readiness-certificate-osha-10',
    shortName: 'Construction readiness',
    demand: 'High',
    certs: 'OSHA-10, trades fundamentals',
  },
];

function difficultyStars(program: Program): string {
  const extra = getProgramExtra(program.slug);
  const d = extra?.difficulty;
  if (d === 1) return '⭐';
  if (d === 2) return '⭐⭐';
  if (d === 3) return '⭐⭐⭐';
  if (program.category === 'digital-literacy') return '⭐';
  if (program.category === 'manufacturing' || program.category === 'healthcare') return '⭐⭐';
  return '⭐⭐⭐';
}

export function getProgramComparisonTracks(): ComparisonTrack[] {
  return FEATURED.map(({ slug, shortName, demand, certs }) => {
    const program = getProgramBySlug(slug);
    if (!program) {
      throw new Error(`programComparisonTracks: missing program for slug "${slug}"`);
    }
    return {
      shortName,
      slug,
      duration: program.duration.replace(/, 10 hrs\/week/i, '').replace(/10 hrs\/week/i, '~10 hrs/wk').trim(),
      difficulty: difficultyStars(program),
      salary: salaryRangeDisplay(program),
      demand,
      certs,
    };
  });
}
