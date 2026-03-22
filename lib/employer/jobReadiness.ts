/**
 * Draft / pre-submission cues for employer job postings — product-language, not validation.
 */

export type JobReadinessLevel = 'solid' | 'usable' | 'thin';

export type JobReadinessTarget = 'location' | 'salary' | 'description' | 'requirements' | 'suggestedPrograms';

export type JobReadinessIssueKey = JobReadinessTarget;

export type JobReadinessIssue = {
  key: JobReadinessIssueKey;
  target: JobReadinessTarget;
  message: string;
  action: string;
};

export type JobReadiness = {
  level: JobReadinessLevel;
  /** Short, scannable cues (max 4) */
  issues: JobReadinessIssue[];
};

export function assessJobPostingReadiness(input: {
  location: string;
  salaryMin: number | null | undefined;
  salaryMax: number | null | undefined;
  description: string;
  requirementsCount: number;
  suggestedProgramsCount: number;
}): JobReadiness {
  const issues: JobReadinessIssue[] = [];
  const loc = input.location.trim();
  if (!loc || loc === '—') {
    issues.push({
      key: 'location',
      target: 'location',
      message: 'Add where people work (city, hybrid, or remote).',
      action: 'Add location',
    });
  }
  if (input.salaryMin == null && input.salaryMax == null) {
    issues.push({
      key: 'salary',
      target: 'salary',
      message: 'A pay range sets expectations and saves everyone time.',
      action: 'Add pay range',
    });
  }
  const desc = input.description.trim();
  if (desc.length < 140) {
    issues.push({
      key: 'description',
      target: 'description',
      message: 'Expand the role: day-to-day work, must-haves, and nice-to-haves.',
      action: 'Add description',
    });
  }
  if (input.requirementsCount === 0) {
    issues.push({
      key: 'requirements',
      target: 'requirements',
      message: 'Add a few requirement lines — even rough bullets from HR.',
      action: 'Add requirements',
    });
  }
  if (input.suggestedProgramsCount === 0) {
    issues.push({
      key: 'suggestedPrograms',
      target: 'suggestedPrograms',
      message: 'Match training tracks so we can surface certification-ready candidates.',
      action: 'Select training matches',
    });
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
