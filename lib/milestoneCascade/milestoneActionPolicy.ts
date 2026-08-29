import type { ActionDraft, MilestoneType } from './types';

/** Milestones that are counselor signals, never member outreach triggers. */
export function isCounselorOnlyMilestone(milestoneType: MilestoneType): boolean {
  return milestoneType === 'training_started' || milestoneType === 'program_halfway';
}

export function filterMilestoneActions(
  milestoneType: MilestoneType,
  actions: ActionDraft[],
): ActionDraft[] {
  if (!isCounselorOnlyMilestone(milestoneType)) return actions;
  return actions.filter((action) => action.type !== 'celebrate_milestone');
}
