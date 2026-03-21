/**
 * Calculates an applicant "fit score" (1–10) for the admin queue.
 * Based on: program validity, experience level, application completeness, location.
 */

import { getProgramBySlug, PROGRAMS } from '@/lib/content/programs';

export interface FitScoreInput {
  enrolledProgram: string | null;
  programInterest: string | null;
  assessmentScorePct: number | null;
  profile: {
    city?: string | null;
    state?: string | null;
    employmentStatus?: string | null;
    educationLevel?: string | null;
    address?: string | null;
    zip?: string | null;
  } | null;
  fullName: string;
  email: string;
  phone: string | null;
}

export function calculateFitScore(input: FitScoreInput): number {
  let score = 0;

  // 1. Program selected and active (0-3 points)
  const programSlug = input.enrolledProgram || input.programInterest;
  if (programSlug) {
    const program = getProgramBySlug(programSlug);
    if (program) {
      score += 3; // valid, active program
    } else {
      // They selected something but it's not a recognized slug — check by title match
      const titleMatch = PROGRAMS.some(
        (p) => p.title.toLowerCase() === programSlug.toLowerCase()
      );
      score += titleMatch ? 2 : 1;
    }
  }

  // 2. Experience / assessment readiness (0-2 points)
  if (input.assessmentScorePct != null) {
    if (input.assessmentScorePct >= 70) score += 2;
    else if (input.assessmentScorePct >= 50) score += 1;
  }

  // 3. Application completeness (0-3 points)
  let fieldsComplete = 0;
  if (input.fullName?.trim()) fieldsComplete++;
  if (input.email?.trim()) fieldsComplete++;
  if (input.phone?.trim()) fieldsComplete++;
  if (input.profile?.address || input.profile?.city) fieldsComplete++;
  if (input.profile?.employmentStatus) fieldsComplete++;
  if (input.profile?.educationLevel) fieldsComplete++;

  if (fieldsComplete >= 5) score += 3;
  else if (fieldsComplete >= 3) score += 2;
  else if (fieldsComplete >= 1) score += 1;

  // 4. Austin area location bonus (0-2 points)
  const city = input.profile?.city?.toLowerCase() ?? '';
  const state = input.profile?.state?.toLowerCase() ?? '';
  const zip = input.profile?.zip ?? '';
  const austinCities = ['austin', 'round rock', 'cedar park', 'pflugerville', 'georgetown', 'leander', 'kyle', 'buda', 'manor', 'hutto'];
  const travisCountyZips = ['787', '786'];

  if (austinCities.some((c) => city.includes(c)) || (state.includes('tx') && city)) {
    score += 2;
  } else if (travisCountyZips.some((z) => zip.startsWith(z))) {
    score += 2;
  } else if (state.includes('texas') || state === 'tx') {
    score += 1;
  }

  return Math.min(10, Math.max(1, score));
}

export function getFitScoreColor(score: number): string {
  if (score >= 8) return '#16a34a'; // green
  if (score >= 5) return '#d97706'; // amber
  return '#dc2626'; // red
}

export function getFitScoreLabel(score: number): string {
  if (score >= 8) return 'Strong';
  if (score >= 5) return 'Fair';
  return 'Low';
}
