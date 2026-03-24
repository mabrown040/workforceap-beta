/**
 * Server-side gates for employer "submit for review" — must match JobForm submit checks
 * so incomplete postings cannot enter pending review and the downgrade flash can explain why.
 */

export type EmployerJobSubmitReviewFields = {
  location: string | null | undefined;
  requirements: string[];
  salaryMin: number | null | undefined;
  salaryMax: number | null | undefined;
  description: string;
  suggestedPrograms: string[];
};

export function employerJobSubmitReviewDowngradeReasons(fields: EmployerJobSubmitReviewFields): string[] {
  const reasons: string[] = [];
  const loc = (fields.location ?? '').trim();
  if (!loc) reasons.push('work location');
  if (fields.requirements.length < 2) reasons.push('at least two requirement lines');
  if (fields.salaryMin == null && fields.salaryMax == null) reasons.push('salary range');
  if (fields.description.trim().length < 140) reasons.push('a fuller job description');
  if (fields.suggestedPrograms.length < 1) reasons.push('at least one training track match');
  return reasons;
}

export function resolveEmployerJobPendingSubmission(fields: EmployerJobSubmitReviewFields): {
  status: 'draft' | 'pending';
  reviewDowngradeReasons: string[];
} {
  const reviewDowngradeReasons = employerJobSubmitReviewDowngradeReasons(fields);
  if (reviewDowngradeReasons.length > 0) {
    return { status: 'draft', reviewDowngradeReasons };
  }
  return { status: 'pending', reviewDowngradeReasons: [] };
}
