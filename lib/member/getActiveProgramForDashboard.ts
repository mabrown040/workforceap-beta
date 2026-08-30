import 'server-only';

import { canBypassMemberAssessment } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import { resolveStaffTrainingPreviewProgramSlug } from '@/lib/member/staffTrainingProgramFallback';
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
 * still participates in reconciliation elsewhere. We only read from it as a
 * legacy fallback for users whose CourseEnrollment row hasn't backfilled.
 *
 * Staff who bypass the member assessment (`canBypassMemberAssessment`) get
 * a synthetic catalog slug when they have no enrollment so /dashboard/training
 * still renders course cards (dogfood). xAPI ingest uses the same fallback for
 * admins without enrollments (`lib/member/staffTrainingProgramFallback.ts`).
 *
 * The pure resolution logic lives in `./resolveActiveDashboardProgram` so
 * unit tests don't need a Prisma client.
 */

export type { DashboardEnrollment } from './resolveActiveDashboardProgram';

export type ActiveProgramForDashboard = {
  /** The program whose data the page should render. Either the slug
   *  requested via query string (must be one of the user's enrollments),
   *  the user's primary enrollment slug, the legacy
   *  `User.enrolledProgram`, or (for staff who bypass assessment) a preview
   *  catalog slug when nothing is enrolled — null only if none applies. */
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
  /** Coursera progress exists, but staff has not assigned a WAP program. */
  noProgram: boolean;
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
          curriculumVersion: true,
          isPrimary: true,
          enrolledAt: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
      },
      courseProgress: {
        take: 1,
        orderBy: [{ lastActivityAt: 'desc' }, { lastUpdatedAt: 'desc' }],
        select: { programSlug: true },
      },
    },
  });

  const enrollments = dbUser?.courseEnrollments ?? [];
  const legacyEnrolledProgram = dbUser?.enrolledProgram ?? null;

  const { activeProgramSlug: resolvedActive, primaryProgramSlug: resolvedPrimary, legacyEnrolledProgramMismatch } =
    resolveActiveDashboardProgram({
      enrollments,
      legacyEnrolledProgram,
      requestedProgramSlug: args.requestedProgramSlug,
    });

  let activeProgramSlug = resolvedActive;
  let primaryProgramSlug = resolvedPrimary;
  let noProgram = false;

  if (!activeProgramSlug) {
    const progressOnlySlug = dbUser?.courseProgress?.[0]?.programSlug;
    if (progressOnlySlug) {
      const canonical = canonicalizeProgramSlug(progressOnlySlug);
      if (getProgramBySlug(canonical)) {
        activeProgramSlug = canonical;
        noProgram = true;
      }
    }
  }

  if (!activeProgramSlug && (await canBypassMemberAssessment(args.userId))) {
    const preview = await resolveStaffTrainingPreviewProgramSlug(args.userId);
    if (preview) {
      activeProgramSlug = preview;
      primaryProgramSlug = preview;
      noProgram = false;
    }
  }

  const programTitle = activeProgramSlug
    ? getProgramBySlug(activeProgramSlug)?.title ?? activeProgramSlug
    : null;

  return {
    activeProgramSlug,
    primaryProgramSlug,
    allEnrollments: enrollments,
    programTitle,
    legacyEnrolledProgramMismatch,
    noProgram,
  };
}
