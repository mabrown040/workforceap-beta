import type { CareerMatchResult } from '@/lib/onet/types';

export type SuggestedGoal = {
  /** Stable key so the UI can dedupe / track one-tap adds. */
  key: string;
  goalType: string;
  title: string;
  /** Short motivating reason shown under the suggestion. */
  reason: string;
};

/**
 * Suggest a small set of starter goals derived from a member's career
 * recommendation (the "Find Your Path" quiz result stored on
 * User.careerRecommendationJson). Pure + deterministic so it can run on the
 * server or client. Returns at most `limit` suggestions.
 */
export function suggestGoalsFromCareer(
  careerRec: CareerMatchResult | null | undefined,
  limit = 4
): SuggestedGoal[] {
  const suggestions: SuggestedGoal[] = [];

  const topOccupation = careerRec?.topOccupations?.[0];
  const primaryProgram = careerRec?.recommendedPrograms
    ?.filter((p) => p.recommendationType === 'primary')
    .sort((a, b) => a.priority - b.priority)[0];

  if (topOccupation?.title) {
    suggestions.push({
      key: 'career_pivot:target_role',
      goalType: 'career_pivot',
      title: `Get ready for a ${topOccupation.title} role`,
      reason: `Your top career match${
        typeof topOccupation.confidence === 'number'
          ? ` (${Math.round(topOccupation.confidence * 100)}% fit)`
          : ''
      } ΓÇö let's build toward it.`,
    });
  }

  if (primaryProgram?.programSlug) {
    suggestions.push({
      key: 'complete_certification:primary_program',
      goalType: 'complete_certification',
      title: 'Complete my recommended certificate',
      reason:
        primaryProgram.whyRecommended?.trim() ||
        'Your recommended program is the fastest path to your goal.',
    });
  }

  // Always-useful starters, ordered after the personalized ones.
  suggestions.push({
    key: 'build_resume:starter',
    goalType: 'build_resume',
    title: topOccupation?.title
      ? `Build a resume for ${topOccupation.title}`
      : 'Build a strong resume',
    reason: 'A polished resume is the foundation for every application.',
  });

  suggestions.push({
    key: 'apply_to_jobs:starter',
    goalType: 'apply_to_jobs',
    title: 'Apply to jobs consistently',
    reason: 'Steady applications turn effort into interviews.',
  });

  if (careerRec?.supportFlags?.needsComputerSupport) {
    suggestions.push({
      key: 'tech_readiness:support',
      goalType: 'tech_readiness',
      title: 'Build my tech confidence',
      reason: 'A little practice with the basics goes a long way.',
    });
  }

  // Dedupe by key, then cap.
  const seen = new Set<string>();
  return suggestions
    .filter((s) => (seen.has(s.key) ? false : (seen.add(s.key), true)))
    .slice(0, limit);
}
