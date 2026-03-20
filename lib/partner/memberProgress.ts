import { getProgramBySlug } from '@/lib/content/programs';

export function memberProgramProgressPct(
  enrolledProgram: string | null,
  coursesCompleted: unknown
): number {
  const program = enrolledProgram ? getProgramBySlug(enrolledProgram) : null;
  const completed = Array.isArray(coursesCompleted) ? (coursesCompleted as string[]) : [];
  if (!program?.courses.length) return 0;
  const n = completed.filter((s) => program.courses.some((c) => c.slug === s)).length;
  return Math.round((n / program.courses.length) * 100);
}
