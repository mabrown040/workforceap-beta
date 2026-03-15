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
