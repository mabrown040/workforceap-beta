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

/**
 * Map a program's categoryLabel to the matching pathway category.
 * Programs use labels like 'IT & Cybersecurity'; pathways use 'Technology'.
 */
const CATEGORY_TO_PATHWAY: Record<string, string> = {
  'IT & Cybersecurity': 'Technology',
  'AI & Software Dev': 'Data & AI',
  'Cloud & Data': 'Data & AI',
  'Data & AI': 'Data & AI',
  'Business': 'Business',
  'Healthcare': 'Business',
  'Manufacturing': 'Technology',
  'Construction & Trades': 'Technology',
  'Digital Literacy': 'Technology',
  'Technology': 'Technology',
};

/**
 * Look up the learning pathway that matches a member's enrolled program.
 *
 * INVARIANT: Every member should see the pathway that matches their actual
 * program, not a hardcoded PATHWAYS[0]. Falls back to PATHWAYS[0] when
 * the program is null, not found, or has no matching pathway category.
 */
export function getPathwayForProgram(programSlug: string | null): LearningPathway {
  if (!programSlug) return PATHWAYS[0];

  // Inline require to avoid circular dependency (programs imports from other content modules)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getProgramBySlug } = require('@/lib/content/programs');
  const program = getProgramBySlug(programSlug);
  if (!program) return PATHWAYS[0];

  const targetCategory = CATEGORY_TO_PATHWAY[program.categoryLabel] ?? program.categoryLabel;
  const match = PATHWAYS.find((p) => p.category === targetCategory);
  return match ?? PATHWAYS[0];
}
