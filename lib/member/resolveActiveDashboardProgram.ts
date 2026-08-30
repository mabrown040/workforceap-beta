/**
 * Pure resolution logic for "which CourseEnrollment should the dashboard
 * render?" — split out from `getActiveProgramForDashboard.ts` so unit tests
 * (and any non-server caller) don't have to load the `server-only` Prisma
 * wrapper. The Prisma helper composes this function with a single
 * `prisma.user.findUnique` call.
 */

import { programSlugsEquivalent } from '../content/programSlug';

export type DashboardEnrollment = {
  id: string;
  programSlug: string;
  curriculumVersion?: string;
  isPrimary: boolean;
  enrolledAt: Date;
};

export type ResolvedActiveDashboardProgram = {
  activeProgramSlug: string | null;
  primaryProgramSlug: string | null;
  /** True when `User.enrolledProgram` (legacy single-program field) and the
   *  primary `CourseEnrollment.programSlug` disagree — surface as a log so
   *  admins can reconcile, but DO NOT auto-correct. */
  legacyEnrolledProgramMismatch: boolean;
};

export function resolveActiveDashboardProgram(args: {
  enrollments: DashboardEnrollment[];
  legacyEnrolledProgram: string | null;
  requestedProgramSlug?: string | null;
}): ResolvedActiveDashboardProgram {
  const { enrollments, legacyEnrolledProgram } = args;
  const primaryEnrollment =
    enrollments.find((e) => e.isPrimary) ??
    (legacyEnrolledProgram
      ? enrollments.find((e) =>
          programSlugsEquivalent(e.programSlug, legacyEnrolledProgram),
        ) ?? null
      : null);
  const requested = args.requestedProgramSlug?.trim() ?? '';
  const matchingRequested = requested && primaryEnrollment
    ? enrollments.find((e) => programSlugsEquivalent(e.programSlug, requested))
    : null;

  const primaryProgramSlug = primaryEnrollment?.programSlug ?? legacyEnrolledProgram ?? null;
  const activeProgramSlug =
    matchingRequested?.programSlug ?? primaryProgramSlug ?? null;
  const legacyEnrolledProgramMismatch =
    !!legacyEnrolledProgram &&
    !!primaryEnrollment &&
    !programSlugsEquivalent(legacyEnrolledProgram, primaryEnrollment.programSlug);

  return { activeProgramSlug, primaryProgramSlug, legacyEnrolledProgramMismatch };
}
