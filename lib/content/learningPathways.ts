export type LearningPathway = {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: string[];
  estimatedWeeks: number;
};

export const PATHWAYS: LearningPathway[] = [
  {
    id: 'it-support',
    title: 'IT Support Professional',
    description: 'Foundational IT support skills leading to CompTIA A+ and help desk roles.',
    category: 'Technology',
    steps: ['Digital Literacy', 'CompTIA A+', 'IT Support Certificate', 'Job readiness'],
    estimatedWeeks: 16,
  },
  {
    id: 'data-analytics',
    title: 'Data Analytics',
    description: 'Data analysis and visualization for business intelligence roles.',
    category: 'Data & AI',
    steps: ['Excel/Sheets', 'SQL basics', 'Data Analytics Certificate', 'Portfolio project'],
    estimatedWeeks: 20,
  },
  {
    id: 'project-management',
    title: 'Project Management',
    description: 'Project management fundamentals and PMP preparation.',
    category: 'Business',
    steps: ['PM fundamentals', 'Agile/Scrum', 'Microsoft PM Certificate', 'Capstone'],
    estimatedWeeks: 12,
  },
  {
    id: 'cybersecurity',
    title: 'Cybersecurity',
    description: 'Security fundamentals and CompTIA Security+ preparation.',
    category: 'Technology',
    steps: ['Network+', 'Security+', 'Cybersecurity Certificate', 'Practice labs'],
    estimatedWeeks: 18,
  },
];

const PATHWAY_BY_ID = Object.fromEntries(PATHWAYS.map((pathway) => [pathway.id, pathway])) as Record<string, LearningPathway>;

const PROGRAM_SLUG_TO_PATHWAY_ID: Record<string, string> = {
  'digital-literacy-empowerment-class': 'it-support',
  'it-support-professional-certificate-ibm': 'it-support',
  'comptia-a-professional-certificate': 'it-support',
  'comptia-network-professional-certificate': 'it-support',
  'it-automation-with-python-google': 'it-support',
  'cybersecurity-professional-certificate-google': 'cybersecurity',
  'comptia-security-professional-certificate': 'cybersecurity',
  'data-analytics-professional-certificate-google': 'data-analytics',
  'data-science-professional-certificate-ibm': 'data-analytics',
  'ai-professional-developer-certificate-ibm': 'data-analytics',
  'software-developer-professional-certificate-ibm': 'data-analytics',
  'aws-cloud-technology-amazon': 'data-analytics',
  'project-management-professional-certificate-microsoft': 'project-management',
  'digital-marketing-e-commerce-google': 'project-management',
  'ux-design-professional-certificate-google': 'project-management',
};

const CATEGORY_TO_PATHWAY_ID: Record<string, string> = {
  'digital-literacy': 'it-support',
  'it-cyber': 'it-support',
  'ai-software': 'data-analytics',
  'cloud-data': 'data-analytics',
  business: 'project-management',
};

function getPathwayById(pathwayId: string | null | undefined): LearningPathway | null {
  if (!pathwayId) return null;
  return PATHWAY_BY_ID[pathwayId] ?? null;
}

/**
 * Look up the learning pathway that matches a member's enrolled program.
 *
 * INVARIANT: Every member should see the pathway that best matches their actual
 * program, not a hardcoded IT Support fallback just because a category label or
 * slug was not mapped yet.
 */
export function getPathwayForProgram(programSlug: string | null): LearningPathway {
  if (!programSlug) return PATHWAY_BY_ID['it-support'];

  if (PROGRAM_SLUG_TO_PATHWAY_ID[programSlug]) {
    return PATHWAY_BY_ID[PROGRAM_SLUG_TO_PATHWAY_ID[programSlug]];
  }

  // Inline require to avoid circular dependency (programs imports from other content modules)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getProgramBySlug } = require('@/lib/content/programs');
  const program = getProgramBySlug(programSlug);
  if (!program) return PATHWAY_BY_ID['it-support'];

  if (program.category === 'it-cyber') {
    const slug = program.slug.toLowerCase();
    const title = program.title.toLowerCase();
    if (slug.includes('security') || slug.includes('cyber') || title.includes('security') || title.includes('cyber')) {
      return PATHWAY_BY_ID['cybersecurity'];
    }
  }

  return getPathwayById(CATEGORY_TO_PATHWAY_ID[program.category]) ?? PATHWAY_BY_ID['it-support'];
}
