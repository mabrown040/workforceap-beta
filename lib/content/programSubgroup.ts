import type { Program } from '@/lib/content/programs';

/** Stakeholder-facing browse groups on /programs (maps static `Program.category` + slug hints). */
export type ProgramSubgroupId =
  | 'digital-literacy'
  | 'it-support'
  | 'database'
  | 'programming'
  | 'web-programming'
  | 'leadership'
  | 'medical'
  | 'manufacturing-logistics'
  | 'construction'
  | 'other';

export type ProgramSubgroup = {
  id: ProgramSubgroupId;
  label: string;
  shortLabel: string;
  description: string;
};

export const PROGRAM_SUBGROUPS: ProgramSubgroup[] = [
  {
    id: 'digital-literacy',
    label: 'Digital Literacy',
    shortLabel: 'Digital Literacy',
    description: 'Foundational digital skills and confidence for today’s workplace.',
  },
  {
    id: 'it-support',
    label: 'IT Support',
    shortLabel: 'IT Support',
    description: 'Help desk, hardware, and core IT pathways.',
  },
  {
    id: 'database',
    label: 'Database & Data Platforms',
    shortLabel: 'Database',
    description: 'Data storage, analytics, and data-centric roles.',
  },
  {
    id: 'programming',
    label: 'AI and Software Developer',
    shortLabel: 'AI & Software',
    description: 'Software development, automation, and engineering tracks.',
  },
  {
    id: 'web-programming',
    label: 'Web & Front End',
    shortLabel: 'Web',
    description: 'Web technologies, UX, and product-facing builds.',
  },
  {
    id: 'leadership',
    label: 'Leadership, Business, & Marketing',
    shortLabel: 'Leadership',
    description: 'Project management, marketing, UX, and business skills.',
  },
  {
    id: 'medical',
    label: 'Medical & Health IT',
    shortLabel: 'Medical',
    description: 'Healthcare information and coding pathways.',
  },
  {
    id: 'manufacturing-logistics',
    label: 'Manufacturing & Logistics',
    shortLabel: 'Mfg & Logistics',
    description: 'Production, supply chain, and technician credentials.',
  },
  {
    id: 'construction',
    label: 'Construction & Trades',
    shortLabel: 'Construction',
    description: 'Safety, trades readiness, and construction fundamentals.',
  },
  {
    id: 'other',
    label: 'Other',
    shortLabel: 'Other',
    description: 'Additional tracks.',
  },
];

const SUBGROUP_ORDER: ProgramSubgroupId[] = [
  'digital-literacy',
  'it-support',
  'database',
  'programming',
  'web-programming',
  'leadership',
  'medical',
  'manufacturing-logistics',
  'construction',
  'other',
];

export function subgroupForProgram(p: Program): ProgramSubgroupId {
  const slug = p.slug.toLowerCase();
  const title = p.title.toLowerCase();

  if (p.category === 'digital-literacy') return 'digital-literacy';
  if (p.category === 'healthcare' || title.includes('medical') || title.includes('health information')) {
    return 'medical';
  }
  if (p.category === 'manufacturing') {
    if (title.includes('construction') || title.includes('osha')) return 'construction';
    if (title.includes('logistics') || title.includes('supply')) return 'manufacturing-logistics';
    return 'manufacturing-logistics';
  }
  if (p.category === 'business') {
    if (title.includes('project management')) return 'leadership';
    if (title.includes('ux') || title.includes('design')) return 'web-programming';
    if (title.includes('marketing') || title.includes('e-commerce') || title.includes('ecommerce')) {
      return 'leadership';
    }
    return 'leadership';
  }
  if (slug.includes('ux-design')) return 'web-programming';
  if (p.category === 'ai-software') {
    if (title.includes('developer') && title.includes('certificate')) return 'programming';
    if (title.includes('ai') || title.includes('ibm')) return 'programming';
    return 'programming';
  }
  if (p.category === 'cloud-data') {
    if (slug.includes('data-analytics') || slug.includes('data-science')) return 'database';
    return 'database';
  }
  if (p.category === 'it-cyber') {
    if (title.includes('security') || title.includes('cyber')) return 'it-support';
    if (title.includes('network')) return 'it-support';
    if (title.includes('automation') || title.includes('python')) return 'programming';
    return 'it-support';
  }
  return 'other';
}

export function programsBySubgroup(programs: Program[]): Map<ProgramSubgroupId, Program[]> {
  const map = new Map<ProgramSubgroupId, Program[]>();
  for (const id of SUBGROUP_ORDER) {
    map.set(id, []);
  }
  for (const p of programs) {
    const id = subgroupForProgram(p);
    map.get(id)!.push(p);
  }
  return map;
}

export function orderedSubgroupIdsWithPrograms(programs: Program[]): ProgramSubgroupId[] {
  const map = programsBySubgroup(programs);
  return SUBGROUP_ORDER.filter((id) => (map.get(id)?.length ?? 0) > 0);
}
