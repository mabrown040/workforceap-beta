import { getProgramBySlug } from '@/lib/content/programs';

type MemberProgramProgressSummary = {
  programSlug: string;
  averagePercent: number;
  coursesCompleted: number;
} | null | undefined;

export function memberProgramProgressPct(
  enrolledProgram: string | null,
  coursesCompleted: unknown,
  liveProgress?: MemberProgramProgressSummary | MemberProgramProgressSummary[]
): number {
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const rollup = Array.isArray(liveProgress)
    ? liveProgress.find((row) => row?.programSlug === enrolledProgram)
    : liveProgress?.programSlug === enrolledProgram
      ? liveProgress
      : null;

  if (rollup) {
    return Math.max(0, Math.min(100, Math.round(rollup.averagePercent)));
  }

  const completed = Array.isArray(coursesCompleted) ? (coursesCompleted as string[]) : [];
  if (!program?.courses.length) return 0;
  const n = completed.filter((s) => program.courses.some((c) => c.slug === s)).length;
  return Math.round((n / program.courses.length) * 100);
}

export function memberProgramCompleted(
  enrolledProgram: string | null,
  coursesCompleted: unknown,
  liveProgress?: MemberProgramProgressSummary | MemberProgramProgressSummary[]
): boolean {
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  if (!program?.courses.length) return false;

  const rollup = Array.isArray(liveProgress)
    ? liveProgress.find((row) => row?.programSlug === enrolledProgram)
    : liveProgress?.programSlug === enrolledProgram
      ? liveProgress
      : null;

  if (rollup) return rollup.coursesCompleted >= program.courses.length || rollup.averagePercent >= 100;

  const completed = Array.isArray(coursesCompleted) ? (coursesCompleted as string[]) : [];
  return program.courses.every((c) => completed.includes(c.slug));
}
