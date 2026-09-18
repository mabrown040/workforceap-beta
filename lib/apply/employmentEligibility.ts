/**
 * Adult employment-screening fit.
 *
 * Ops order (do not collapse unemployed + underemployed):
 *   1. Unemployed
 *   2. Receiving unemployment (case-by-case on its own)
 *   3. Unemployment benefits exhausted
 *   4. Working part-time / underemployed
 *
 * 1, 3, or 4 → qualify. 2 alone → case-by-case review.
 */

import type { YesNo } from '@/lib/apply/eligibilityExtendedFields';

export type EmploymentAnswers = {
  unemployed: YesNo | null;
  receivingUnemployment: YesNo | null;
  exhaustedUnemployment: YesNo | null;
  underemployed: YesNo | null;
};

export type EmploymentFit = 'qualify' | 'case_by_case' | 'review';

export type EmploymentEligibilityScore = {
  fit: EmploymentFit;
  qualifies: boolean;
  yesCount: number;
};

export function scoreEmploymentEligibility(answers: EmploymentAnswers): EmploymentEligibilityScore {
  const unemployed = answers.unemployed === 'yes';
  const exhausted = answers.exhaustedUnemployment === 'yes';
  const underemployed = answers.underemployed === 'yes';
  const receiving = answers.receivingUnemployment === 'yes';
  const yesCount = [unemployed, exhausted, underemployed].filter(Boolean).length;

  if (unemployed || exhausted || underemployed) {
    return { fit: 'qualify', qualifies: true, yesCount };
  }
  if (receiving) {
    return { fit: 'case_by_case', qualifies: false, yesCount };
  }
  return { fit: 'review', qualifies: false, yesCount };
}

export function employmentFitLabel(fit: EmploymentFit): string {
  switch (fit) {
    case 'qualify':
      return 'likely qualify';
    case 'case_by_case':
      return 'case by case';
    case 'review':
      return 'review';
    default: {
      const _exhaustive: never = fit;
      return _exhaustive;
    }
  }
}
