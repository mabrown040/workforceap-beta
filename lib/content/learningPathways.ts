import { getProgramBySlug, type Program } from '@/lib/content/programs';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

export type LearningPathway = {
  id: string;
  title: string;
  description: string;
  category: string;
  steps: string[];
  estimatedWeeks: number;
};

/**
 * Generic category-level pathways. Used as a fallback when no enrolled program
 * is on file (e.g. a member browsing the learning hub before enrollment) and
 * for the "all pathways" overview on /dashboard/learning.
 */
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

/** Parse a duration string like "3-5 months, 10 hrs/week" into approximate weeks. */
function deriveEstimatedWeeks(duration: string): number {
  const monthMatch = duration.match(/(\d+)\s*(?:-\s*(\d+))?\s*months?/i);
  if (monthMatch) {
    const lo = parseInt(monthMatch[1], 10);
    const hi = monthMatch[2] ? parseInt(monthMatch[2], 10) : lo;
    return Math.round(((lo + hi) / 2) * 4.3);
  }
  const weekMatch = duration.match(/(\d+)\s*weeks?/i);
  if (weekMatch) return parseInt(weekMatch[1], 10);
  return 0;
}

/** Build a pathway directly from a program's metadata — id is the program slug. */
function buildProgramPathway(
  program: Program,
  courses: Program['courses'] = program.courses,
): LearningPathway {
  return {
    id: program.slug,
    title: program.title,
    description: `${program.categoryLabel} pathway · ${program.partner}`,
    category: program.categoryLabel,
    steps: courses.map((c) => c.name),
    estimatedWeeks: deriveEstimatedWeeks(program.duration),
  };
}

/**
 * Resolve the active pathway for a member based on their actual enrolled
 * program. Returns null when no enrolled program or unresolved slug — callers
 * must render an empty/enroll-prompt state rather than a default pathway,
 * since a default would mislead members into a path they did not choose.
 */
export function getPathwayForProgram(
  programSlug: string | null,
  curriculumVersion: string | null | undefined,
): LearningPathway | null {
  if (!programSlug) return null;
  const program = getProgramBySlug(programSlug);
  if (!program) return null;
  const courses = getProgramCoursesForCurriculumVersion(program, curriculumVersion);
  if (courses.length === 0) return null;
  return buildProgramPathway(program, courses);
}

/** Look up a pathway by id — checks both program-derived and category pathways. */
export function findPathwayById(pathwayId: string): LearningPathway | null {
  const program = getProgramBySlug(pathwayId);
  if (program && program.courses.length > 0) return buildProgramPathway(program);
  return PATHWAYS.find((p) => p.id === pathwayId) ?? null;
}
