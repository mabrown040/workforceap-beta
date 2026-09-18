import {
  resolveActiveDashboardProgram,
  type DashboardEnrollment,
} from './resolveActiveDashboardProgram';

export type ProgramStartAccess = {
  enrolledSlug: string | null;
  bounceToProgram: boolean;
};

/**
 * Bounce rule for `/dashboard/program/start`.
 *
 * `/dashboard/program` already resolves enrollment from CourseEnrollment via
 * `getActiveProgramForDashboard`. Gating start on `User.enrolledProgram` bounced
 * members whose live assignment was only on the enrollment row (legacy column
 * null). Do not write back to `User.enrolledProgram` from this path.
 */
export function resolveProgramStartAccess(args: {
  enrollments: DashboardEnrollment[];
  legacyEnrolledProgram: string | null;
}): ProgramStartAccess {
  return programStartAccessFromDashboardView(
    resolveActiveDashboardProgram({
      enrollments: args.enrollments,
      legacyEnrolledProgram: args.legacyEnrolledProgram,
    }),
  );
}

/** Same bounce rule after the page has already loaded the dashboard program view. */
export function programStartAccessFromDashboardView(active: {
  activeProgramSlug: string | null;
}): ProgramStartAccess {
  const enrolledSlug = active.activeProgramSlug;
  return {
    enrolledSlug,
    bounceToProgram: !enrolledSlug,
  };
}
