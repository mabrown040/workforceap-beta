import { getProgramBySlug } from '@/lib/content/programs';
import { computeTrainingProgress, type LiveTrainingProgressSummary } from '@/lib/member/trainingProgress';

export function memberProgramProgressPct(
  enrolledProgram: string | null,
  coursesCompleted: unknown,
  liveProgress?: LiveTrainingProgressSummary | LiveTrainingProgressSummary[]
): number {
  return computeTrainingProgress(enrolledProgram, coursesCompleted, liveProgress).pct;
}

export function memberProgramCompleted(
  enrolledProgram: string | null,
  coursesCompleted: unknown,
  liveProgress?: LiveTrainingProgressSummary | LiveTrainingProgressSummary[]
): boolean {
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  if (!program?.courses.length) return false;
  const progress = computeTrainingProgress(enrolledProgram, coursesCompleted, liveProgress);
  return progress.allComplete;
}
