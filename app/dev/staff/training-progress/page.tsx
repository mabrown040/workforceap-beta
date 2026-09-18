import { notFound } from 'next/navigation';
import TrainingProgressRoster from '@/components/admin/TrainingProgressRoster';
import type { TrainingRow } from '@/components/portal/kit/pages/admin-subviews/TrainingProgressKit';

/**
 * Showcase-only render of the admin Training progress roster — no auth/DB, so
 * screenshot tooling can photograph sorted column headers directly.
 */
export const dynamic = 'force-dynamic';

const PROGRAMS = [
  'IT Support Professional Certificate (IBM)',
  'AI and Software Developer Professional Certificate',
  'Google Cybersecurity Professional Certificate',
  'AWS Cloud Solutions Architect Professional Certificate',
] as const;

const PACES = ['On track', 'Ahead', 'Behind', 'Stalled'] as const;

const ROWS: TrainingRow[] = Array.from({ length: 53 }, (_, index) => {
  const program = PROGRAMS[index % PROGRAMS.length];
  const modulesTotal = 10 + (index % 8);
  const modulesDone = Math.min(modulesTotal, Math.floor((index * 7) % (modulesTotal + 1)));
  const percentComplete = modulesTotal > 0 ? Math.round((modulesDone / modulesTotal) * 100) : 0;
  const pace = PACES[index % PACES.length];
  const noProgram = index % 11 === 0;
  const unmatched = index === 52;
  return {
    id: unmatched ? 'coursera:zed@example.com' : `u${index}:prog-${index % 4}`,
    student: unmatched
      ? 'Zed Coursera'
      : [
          'Noel Gonzalez',
          'Joseph David Ring',
          'Avery Stone',
          'Maria Santos',
          'Priya Kapoor',
          'James Whitmore',
        ][index % 6],
    program: unmatched ? 'Coursera activity' : program,
    modulesDone,
    modulesTotal,
    percentComplete,
    pace,
    courseraGrade: index % 5 === 0 ? null : 70 + (index % 28),
    inWap: !unmatched,
    noProgram: !unmatched && noProgram,
    lastActive: index % 4 === 0 ? '16d ago' : index % 2 === 0 ? '2h ago' : '1d ago',
    lastActiveAt: Date.now() - index * 86_400_000,
  };
});

export default function DevStaffTrainingProgressPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <TrainingProgressRoster
      rows={ROWS}
      showingLabel="Showing 53 learners"
      coverageLabel="47 of 128 members have training activity · 81 not in a program or course yet"
    />
  );
}
