import {
  computeTrainingProgress,
  type ComputeTrainingProgressArgs,
} from '@/lib/member/trainingProgress';

export function memberProgramProgressPct(
  args: ComputeTrainingProgressArgs,
): number {
  return computeTrainingProgress(args).pct;
}

export function memberProgramCompleted(
  args: ComputeTrainingProgressArgs,
): boolean {
  const progress = computeTrainingProgress(args);
  return progress.allComplete;
}
