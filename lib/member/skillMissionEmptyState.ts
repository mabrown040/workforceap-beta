/**
 * Empty-state copy for Skill Missions when there is no summary to render.
 *
 * `loadSkillMissionSummary` returns null when the member has no active
 * program, or when the active program has no catalog missions. Do not tell
 * an already-enrolled member to "choose a program" — that is the wrong next
 * step.
 */
export type SkillMissionEmptyState = {
  title: string;
  description: string;
  primaryAction: { href: string; label: string };
};

export function skillMissionEmptyState(args: {
  programSlug: string | null;
  programTitle: string | null;
}): SkillMissionEmptyState {
  if (args.programSlug) {
    const name = args.programTitle?.trim() || 'this program';
    return {
      title: `No missions for ${name} yet`,
      description: 'Keep training. Missions will show up here when this program has them.',
      primaryAction: { href: '/dashboard/training', label: 'Continue training' },
    };
  }

  return {
    title: 'Enroll to unlock missions',
    description: 'Finish a course, then pass a mission for a resume bullet and interview story.',
    primaryAction: { href: '/dashboard/program', label: 'Choose my program' },
  };
}
