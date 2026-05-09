import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  resolveActiveDashboardProgram,
  type DashboardEnrollment,
} from './resolveActiveDashboardProgram';

/**
 * Single source of truth for "which program does the dashboard show?"
 *
 * Pre-#1080 the home dashboard hero and the training page each derived the
 * displayed program from `User.enrolledProgram`. After #1080 introduced
 * `CourseEnrollment` rows the training page started reading enrollments
 * (with `?program=<slug>` to switch) but the home hero kept reading the
 * legacy single-program field — which produced the stale-name collision
 * when `User.enrolledProgram` and the primary enrollment diverged
 * (e.g. mabrown040@gmail.com showed "AI Professional Practitioner
 * Certificate" in the hero while the primary enrollment was
 * `comptia-a-plus`).
 *
 * Both pages now go through this helper so the hero name and the course
 * list under it are always derived from the same enrollment row. We
 * deliberately do NOT mutate `User.enrolledProgram` here — that field
 * still gates xAPI ingestion (see `lib/xapi/inboundStatementPipeline.ts`)
 * and admin reconciliation lives elsewhere. We only read from it as a
 * legacy fallback for users whose CourseEnrollment row hasn't backfilled.
 *
 * The pure resolution logic lives in `./resolveActiveDashboardProgram` so
 * unit tests don't need a Prisma client.
 */

export type { DashboardEnrollment } from './resolveActiveDashboardProgram';

export type ActiveProgramForDashboard = {
  /** The program whose data the page should render. Either the slug
   *  requested via query string (must be one of the user's enrollments),
   *  the user's primary enrollment slug, or the legacy
   *  `User.enrolledProgram` for unmigrated users — null if none. */
  activeProgramSlug: string | null;
  /** The user's primary enrollment slug (or legacy enrolledProgram). */
  primaryProgramSlug: string | null;
  /** All `CourseEnrollment` rows for the user, primary first. */
  allEnrollments: DashboardEnrollment[];
  /** Resolved title for `activeProgramSlug` via `getProgramBySlug`. */
  programTitle: string | null;
  /** True when the legacy `User.enrolledProgram` doesn't match the primary
   *  enrollment slug. Surfacing this lets the dashboard log the drift; we
   *  do NOT auto-reconcile (admin call). */
  legacyEnrolledProgramMismatch: boolean;
};

export async function getActiveProgramForDashboard(args: {
  userId: string;
  /** Optional `?program=<slug>` from the page's search params. Only honored
   *  if it matches one of the user's enrollment rows. */
  requestedProgramSlug?: string | null;
}): Promise<ActiveProgramForDashboard> {
  const dbUser = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      enrolledProgram: true,
      courseEnrollments: {
        select: {
          id: true,
          programSlug: true,
          isPrimary: true,
          enrolledAt: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
      },
    },
  });

  const enrollments = dbUser?.courseEnrollments ?? [];
  const legacyEnrolledProgram = dbUser?.enrolledProgram ?? null;

  const { activeProgramSlug, primaryProgramSlug, legacyEnrolledProgramMismatch } =
    resolveActiveDashboardProgram({
      enrollments,
      legacyEnrolledProgram,
      requestedProgramSlug: args.requestedProgramSlug,
    });

  const programTitle = activeProgramSlug
    ? getProgramBySlug(activeProgramSlug)?.title ?? activeProgramSlug
    : null;

  return {
    activeProgramSlug,
    primaryProgramSlug,
    allEnrollments: enrollments,
    programTitle,
    legacyEnrolledProgramMismatch,
  };
}
