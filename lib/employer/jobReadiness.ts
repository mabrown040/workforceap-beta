/**
 * Draft / pre-submission cues for employer job postings — product-language, not validation.
 */

export type JobReadinessLevel = 'solid' | 'usable' | 'thin';

export type JobReadiness = {
  level: JobReadinessLevel;
  /** Short, scannable cues (max 4) */
  issues: string[];
};

export function assessJobPostingReadiness(input: {
  location: string;
  salaryMin: number | null | undefined;
  salaryMax: number | null | undefined;
  description: string;
  requirementsCount: number;
  suggestedProgramsCount: number;
}): JobReadiness {
  const issues: string[] = [];
  const loc = input.location.trim();
  if (!loc || loc === '—') {
    issues.push('Add where people work (city, hybrid, or remote).');
  }
  if (input.salaryMin == null && input.salaryMax == null) {
    issues.push('A pay range sets expectations and saves everyone time.');
  }
  const desc = input.description.trim();
  if (desc.length < 140) {
    issues.push('Expand the role: day-to-day work, must-haves, and nice-to-haves.');
  }
  if (input.requirementsCount === 0) {
    issues.push('Add a few requirement lines — even rough bullets from HR.');
  }
  if (input.suggestedProgramsCount === 0) {
    issues.push('Match training tracks so we can prioritize certify-ready applicants.');
  }

  let level: JobReadinessLevel = 'solid';
  if (issues.length >= 3) level = 'thin';
  else if (issues.length >= 1) level = 'usable';

  return { level, issues: issues.slice(0, 4) };
}

export function readinessLabel(level: JobReadinessLevel): string {
  if (level === 'solid') return 'Posting looks complete';
  if (level === 'usable') return 'Almost ready to send';
  return 'Needs a few details';
}
