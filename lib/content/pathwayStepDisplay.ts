import type { LearningPathway } from '@/lib/content/learningPathways';

export type PathwayMilestoneStatus = 'complete' | 'current' | 'locked';

export type PathwayMilestone = {
  stepIndex: number;
  label: string;
  icon: string;
  status: PathwayMilestoneStatus;
  detail: string;
};

/** Material Symbols names — one per step index for the default IT pathway. */
const IT_SUPPORT_STEP_ICONS = ['menu_book', 'memory', 'workspace_premium', 'rocket_launch'] as const;
const FALLBACK_STEP_ICONS = ['flag', 'school', 'task_alt', 'emoji_events'] as const;

export function iconForPathwayStep(pathwayId: string, stepIndex: number): string {
  if (pathwayId === 'it-support' && stepIndex < IT_SUPPORT_STEP_ICONS.length) {
    return IT_SUPPORT_STEP_ICONS[stepIndex];
  }
  return FALLBACK_STEP_ICONS[stepIndex % FALLBACK_STEP_ICONS.length];
}

type ProgressRow = {
  pathwayId: string;
  stepIndex: number;
  status: string;
};

/**
 * Maps each pathway step to complete / current / locked.
 * Completed steps come from DB; the first step not completed is "current"; later steps are locked.
 */
export function buildPathwayMilestones(
  pathway: LearningPathway,
  rows: ProgressRow[]
): PathwayMilestone[] {
  const forPath = rows.filter((r) => r.pathwayId === pathway.id);
  const n = pathway.steps.length;

  const completedIndices = new Set<number>();
  const rowByIndex = new Map<number, ProgressRow>();
  for (const r of forPath) {
    rowByIndex.set(r.stepIndex, r);
    if (r.status === 'completed') {
      completedIndices.add(r.stepIndex);
    }
  }

  let firstIncomplete = -1;
  for (let i = 0; i < n; i++) {
    if (!completedIndices.has(i)) {
      firstIncomplete = i;
      break;
    }
  }

  return pathway.steps.map((label, stepIndex) => {
    const row = rowByIndex.get(stepIndex);

    let status: PathwayMilestoneStatus;
    if (completedIndices.has(stepIndex)) {
      status = 'complete';
    } else if (firstIncomplete === -1) {
      status = 'complete';
    } else if (stepIndex === firstIncomplete) {
      status = 'current';
    } else {
      status = 'locked';
    }

    let detail: string;
    if (status === 'complete') {
      detail = 'Completed';
    } else if (status === 'current') {
      if (row?.status === 'in_progress') {
        detail = 'In progress';
      } else {
        detail = 'Up next';
      }
    } else {
      detail = 'Not started';
    }

    return {
      stepIndex,
      label,
      icon: iconForPathwayStep(pathway.id, stepIndex),
      status,
      detail,
    };
  });
}
