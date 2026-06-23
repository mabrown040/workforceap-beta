import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import {
  B4BTimeoutError,
  getCourseGradebookReports,
  getEnrollmentReports,
  listPrograms,
  type B4BEnrollmentReport,
  type B4BGradebookReport,
} from './b4bClient';
import {
  computeCourseProgressUpdate,
  mergeB4BProgressSignals,
} from './b4bSync';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { prisma } from '@/lib/db/prisma';
import {
  loadCanonicalMappingsForCourseraIds,
  type CanonicalMappingIndex,
} from '@/lib/coursera/canonicalMapping';
import { captureApiError } from '@/lib/observability/captureApiError';
import { replayUnresolvedXapiStatementsForIdentity } from './replayPendingXapi';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { refreshMemberProgramProgressRollup } from '@/lib/member/courseProgress';
import { invalidateLearnerProgressCacheForEmail } from '@/lib/coursera/learnerProgress';
import { getMilestonesCrossed, trackLearningMilestoneServer } from '@/lib/analytics/track';
import { extractGradebookCourseScoreScaled } from '@/lib/coursera/courseGradeDisplay';

/**
 * Shared core for "pull a learner's enrollment + progress from Coursera For
 * Business and seed local rows so xAPI can credit them". Two callers today:
 *
 *   - `app/api/admin/coursera/sync-user-from-b4b/route.ts` — admin/super-admin
 *     synchronously syncs a member by email (toast UI). `enrolledByAdmin` is
 *     the acting admin so the audit trail attributes the seed.
 *
 *   - `app/api/member/coursera/auto-sync/route.ts` — self-only, fired
 *     fail-soft from `/dashboard` server render so a returning learner with a
 *     valid Coursera identity mapping but zero local rows sees real progress
 *     on first visit. `enrolledByAdmin` is null (system-initiated).
 *
 * This file does NOT do auth / org resolution / dedupe — those live in the
 * route handlers because their rules differ (admin sync is always allowed,
 * self auto-sync is rate-limited via `User.lastCourseraAutoSyncAt`). Keep
 * this function purely about pulling B4B + writing CourseEnrollment +
 * draining xAPI; everything else is the caller's job.
 */

export type DroppedItem = {
  courseraContentId: string;
  reason: string;
};

export type ResolvedCourse = {
  courseraContentId: string;
  wapProgramSlug: string;
  wapCourseSlug: string;
  /** May be null when the row was matched only via a DB canonical mapping
   *  (the static catalog is the only source that carries `courseraProgramId`). */
  courseraProgramId: string | null;
  isCompleted: boolean;
  overallProgress: number | null;
  lastActivityAt: number | null;
};

export type SyncUserFromB4BResult = {
  ok: boolean;
  wapUserId: string;
  coursera: {
    programsChecked: number;
    enrollmentReportsFound: number;
    gradebookReportsFound: number;
  };
  mapped: {
    seededEnrollments: number;
    updatedEnrollments: number;
    primaryProgramSlug: string | null;
    enrolledProgramSlugs: string[];
    droppedNoMapping: DroppedItem[];
    /** CourseProgress rows upserted from the merged gradebook+enrollment signal. */
    courseProgressUpserted: number;
  };
  xapi: {
    statementsReplayed: number;
    nowCredited: number;
  };
  message: string;
};

/**
 * Look up a Coursera contentId, preferring an admin-curated DB mapping in
 * `coursera_canonical_course_mappings` (when a pre-loaded index is supplied)
 * before falling back to the static DISCOVERED_COURSERA_PROGRAMS catalog.
 *
 * Resolution order:
 *   1. Admin-curated mapping in `coursera_canonical_course_mappings` (passed
 *      in via `canonicalMappings` — same source the CSV promote SQL JOIN
 *      uses; lets admins fix unmapped courses without a redeploy).
 *   2. Static DISCOVERED_COURSERA_PROGRAMS catalog.
 *   3. Null. Catalog rows with `TODO_courseId_*` placeholder courseIds will
 *      never match a real Coursera contentId.
 *
 * `courseraProgramId` is only known when the static catalog matches (it's a
 * Coursera-side identifier we keep on the discovered-program record). DB
 * mappings don't carry it; callers that only need (programSlug, courseSlug)
 * tolerate the null.
 */
export function resolveContentIdToWapCourse(
  contentId: string,
  canonicalMappings?: CanonicalMappingIndex,
): {
  wapProgramSlug: string;
  wapCourseSlug: string;
  courseraProgramId: string | null;
} | null {
  const needle = contentId.trim();
  if (!needle || needle.startsWith('TODO_')) return null;

  const dbHit = canonicalMappings?.byCourseraCourseId.get(needle) ?? null;
  if (dbHit) {
    // Admin-curated row wins. We may also have a static-catalog row for the
    // same contentId — pick its courseraProgramId opportunistically so
    // downstream callers that need it (e.g. CourseEnrollment) keep working,
    // but the (programSlug, courseSlug) always come from the DB row.
    const staticForProgramId =
      DISCOVERED_COURSERA_PROGRAMS[dbHit.programSlug]?.courseraProgramId ?? null;
    let courseraProgramId: string | null = staticForProgramId;
    if (!courseraProgramId) {
      for (const prog of Object.values(DISCOVERED_COURSERA_PROGRAMS)) {
        if (prog.courses.some((c) => c.courseId === needle)) {
          courseraProgramId = prog.courseraProgramId ?? null;
          break;
        }
      }
    }
    return {
      wapProgramSlug: dbHit.programSlug,
      wapCourseSlug: dbHit.courseSlug,
      courseraProgramId,
    };
  }

  for (const [wapProgramSlug, prog] of Object.entries(DISCOVERED_COURSERA_PROGRAMS)) {
    const course = prog.courses.find((c) => c.courseId === needle);
    if (course) {
      return {
        wapProgramSlug,
        wapCourseSlug: course.slug,
        courseraProgramId: prog.courseraProgramId,
      };
    }
  }
  return null;
}

/**
 * Pull authoritative B4B data for a single learner, seed/upsert one
 * CourseEnrollment row per matched program, and replay any unresolved xAPI
 * statements for the identity.
 *
 * @param email           Lower-cased Coursera externalId.
 * @param wapUserId       The matched WAP `users.id` row.
 * @param orgId           Tenant scope for all writes.
 * @param enrolledByAdmin When provided, recorded on new/updated CourseEnrollment
 *                        rows. Use the admin actor's id from the admin route;
 *                        pass null from the self auto-sync trigger.
 * @param existingEnrolledProgram The user's current `User.enrolledProgram`
 *                        (so we don't accidentally flip them to a different
 *                        primary program when both have B4B signals).
 */
export async function syncUserFromB4B(args: {
  email: string;
  wapUserId: string;
  orgId: string;
  enrolledByAdmin: string | null;
  existingEnrolledProgram: string | null;
}): Promise<SyncUserFromB4BResult> {
  const email = args.email.trim().toLowerCase();

  // ────────── 1. Pull authoritative data from Coursera ──────────
  let programs: Array<{ id: string; name: string }> = [];
  try {
    const page = await listPrograms({ excludeContent: true, limit: 100 });
    programs = page.elements.map((p) => ({ id: p.id, name: p.name }));
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `Coursera listPrograms failed: ${err.message}`
        : 'Coursera listPrograms failed',
    );
  }

  // Run enrollment-reports loop and gradebook fetch concurrently. The
  // enrollment loop is per-program (N requests); gradebook is a single
  // email-scoped call. Failing soft on either side: enrollment errors are
  // already swallowed per-program below, and a gradebook failure falls back
  // to enrollment-only behavior (the dashboard ring just stays at the coarse
  // enrollment percentage instead of the finer gradebook one).
  const enrollmentReportsPromise = (async () => {
    const out: B4BEnrollmentReport[] = [];
    for (const program of programs) {
      try {
        const page = await getEnrollmentReports({
          byUserProgramId: true,
          programId: program.id,
          externalId: email,
          limit: 200,
        });
        out.push(...page.elements);
      } catch (err) {
        // Per-program failure shouldn't sink the whole sync; log and continue.
        console.warn(
          `[syncUserFromB4B] enrollmentReports failed for program=${program.id} email=${email}:`,
          err instanceof Error ? err.message : err,
        );
        // Timeouts are transient — don't spam Sentry.
        if (!(err instanceof B4BTimeoutError)) {
          captureApiError(err, {
            route: 'coursera/sync-user-from-b4b',
            extra: { step: 'enrollmentReports', programId: program.id, email },
          });
        }
      }
    }
    return out;
  })();

  const gradebookReportsPromise = (async () => {
    try {
      const page = await getCourseGradebookReports({
        emailOrExternalId: email,
        limit: 200,
      });
      return page.elements;
    } catch (err) {
      console.warn(
        `[syncUserFromB4B] gradebook fetch failed for email=${email}:`,
        err instanceof Error ? err.message : err,
      );
      // Timeouts are transient — don't spam Sentry.
      if (!(err instanceof B4BTimeoutError)) {
        captureApiError(err, {
          route: 'coursera/sync-user-from-b4b',
          extra: { step: 'courseGradebookReports', email },
        });
      }
      return [];
    }
  })();

  const [enrollmentReports, gradebookReports]: [
    B4BEnrollmentReport[],
    B4BGradebookReport[],
  ] = await Promise.all([enrollmentReportsPromise, gradebookReportsPromise]);

  // Pre-load admin-curated mappings from `coursera_canonical_course_mappings`
  // for every contentId we're about to resolve (both enrollment and gradebook
  // sides). This is the SAME source of truth the CSV promote path JOINs
  // against — without it an admin who maps a course via /admin/training-progress
  // would see CSV imports updated immediately, but this per-user sync would
  // still bypass the override and stamp the wrong (programSlug, courseSlug).
  // One IN-list query instead of one round-trip per row.
  const canonicalMappings: CanonicalMappingIndex =
    await loadCanonicalMappingsForCourseraIds([
      ...enrollmentReports.map((r) => r.contentId),
      ...gradebookReports.map((r) => r.courseId ?? null),
    ]);

  // Index gradebook rows by courseId for O(1) lookup during the per-course
  // merge below. If Coursera returns multiple gradebook rows for the same
  // courseId (e.g. the learner is in both a standalone course AND a program
  // that includes it), prefer the one with the most recent activity so the
  // dashboard reflects the latest signal.
  const gradebookByCourseId = new Map<string, B4BGradebookReport>();
  for (const row of gradebookReports) {
    const courseId = (row.courseId ?? '').trim();
    if (!courseId) continue;
    const existing = gradebookByCourseId.get(courseId);
    if (!existing) {
      gradebookByCourseId.set(courseId, row);
      continue;
    }
    const existingActivity = typeof existing.lastActivityAt === 'number' ? existing.lastActivityAt : 0;
    const candidateActivity = typeof row.lastActivityAt === 'number' ? row.lastActivityAt : 0;
    const existingProgress = typeof existing.overallProgress === 'number' ? existing.overallProgress : 0;
    const candidateProgress = typeof row.overallProgress === 'number' ? row.overallProgress : 0;
    if (
      candidateActivity > existingActivity ||
      (candidateActivity === existingActivity && candidateProgress > existingProgress)
    ) {
      gradebookByCourseId.set(courseId, row);
    }
  }

  // ────────── 2. Map Coursera contentIds → WAP (programSlug, courseSlug) ──────
  const resolved: ResolvedCourse[] = [];
  const droppedNoMapping: DroppedItem[] = [];
  const seenDropped = new Set<string>();

  for (const report of enrollmentReports) {
    const contentId = (report.contentId ?? '').trim();
    if (!contentId) continue;
    // Resolution order: admin-curated `coursera_canonical_course_mappings`
    // row (DB) → static DISCOVERED_COURSERA_PROGRAMS catalog → null.
    const match = resolveContentIdToWapCourse(contentId, canonicalMappings);
    if (!match) {
      if (!seenDropped.has(contentId)) {
        seenDropped.add(contentId);
        droppedNoMapping.push({
          courseraContentId: contentId,
          reason:
            'No coursera_canonical_course_mappings row or DISCOVERED_COURSERA_PROGRAMS entry has a course with this courseId (likely a TODO_courseId_* placeholder or unmapped catalog entry).',
        });
      }
      continue;
    }
    resolved.push({
      courseraContentId: contentId,
      wapProgramSlug: match.wapProgramSlug,
      wapCourseSlug: match.wapCourseSlug,
      courseraProgramId: match.courseraProgramId,
      isCompleted: Boolean(report.isCompleted),
      overallProgress:
        typeof report.overallProgress === 'number' ? report.overallProgress : null,
      lastActivityAt:
        typeof report.lastActivity === 'number' ? report.lastActivity : null,
    });
  }

  // Group by wapProgramSlug to score primary-enrollment candidates.
  const programGroups = new Map<
    string,
    { courses: ResolvedCourse[]; lastActivity: number }
  >();
  for (const row of resolved) {
    const existing = programGroups.get(row.wapProgramSlug);
    if (existing) {
      existing.courses.push(row);
      if (row.lastActivityAt && row.lastActivityAt > existing.lastActivity) {
        existing.lastActivity = row.lastActivityAt;
      }
    } else {
      programGroups.set(row.wapProgramSlug, {
        courses: [row],
        lastActivity: row.lastActivityAt ?? 0,
      });
    }
  }

  // ────────── 3. Seed/upsert CourseEnrollment per matched program ──────────
  let seededEnrollments = 0;
  let updatedEnrollments = 0;
  let chosenProgramSlug: string | null = null;
  const enrolledProgramSlugs: string[] = [];

  if (programGroups.size > 0) {
    const candidates = Array.from(programGroups.entries()).sort((a, b) => {
      const sizeDiff = b[1].courses.length - a[1].courses.length;
      if (sizeDiff !== 0) return sizeDiff;
      return b[1].lastActivity - a[1].lastActivity;
    });

    // Prefer the user's already-set enrolledProgram if it matches one of the
    // Coursera program signals (don't accidentally flip a learner from the
    // program they registered for to whatever Coursera saw most of).
    const existingMatch = candidates.find(
      ([slug]) => slug === args.existingEnrolledProgram,
    );
    chosenProgramSlug = (existingMatch ?? candidates[0])![0];

    const enrolledAt = new Date();

    // Clear is_primary on every existing row for this user up front. The
    // partial unique index would reject a second is_primary=true without
    // this, and we may be moving primary to a different slug.
    await withTenantScope(args.orgId, (db) =>
      db.courseEnrollment.updateMany({
        where: { userId: args.wapUserId, isPrimary: true },
        data: { isPrimary: false },
      }),
    );

    for (const [slug] of candidates) {
      enrolledProgramSlugs.push(slug);
      const isPrimary = slug === chosenProgramSlug;
      const existingRow = await withTenantScope(args.orgId, (db) =>
        db.courseEnrollment.findUnique({
          where: { userId_programSlug: { userId: args.wapUserId, programSlug: slug } },
          select: { id: true },
        }),
      );

      if (!existingRow) {
        await withTenantScope(args.orgId, (db) =>
          db.courseEnrollment.create({
            data: {
              organizationId: args.orgId,
              userId: args.wapUserId,
              programSlug: slug,
              isPrimary,
              enrolledAt,
              enrolledByAdminId: args.enrolledByAdmin,
            },
          }),
        );
        seededEnrollments += 1;
      } else {
        await withTenantScope(args.orgId, (db) =>
          db.courseEnrollment.update({
            where: { userId_programSlug: { userId: args.wapUserId, programSlug: slug } },
            data: {
              isPrimary,
              // Only stamp enrolledByAdminId when an admin is explicitly
              // doing the sync; auto-sync (null) shouldn't pretend an
              // admin enrolled them.
              ...(args.enrolledByAdmin ? { enrolledByAdminId: args.enrolledByAdmin } : {}),
            },
          }),
        );
        updatedEnrollments += 1;
      }
    }

    // Pin User.enrolledProgram too — the xAPI pipeline reads this field
    // (not CourseEnrollment) when deciding whether to credit a statement.
    if (args.existingEnrolledProgram !== chosenProgramSlug) {
      await withTenantScope(args.orgId, (db) =>
        db.user.update({
          where: { id: args.wapUserId },
          data: {
            enrolledProgram: chosenProgramSlug!,
            enrolledAt: args.existingEnrolledProgram ? undefined : enrolledAt,
          },
        }),
      );
    }
  }

  // ────────── 3.5. Upsert per-course CourseProgress (gradebook-aware) ──────────
  //
  // The dashboard ring reads CourseProgress.percentComplete per course. When
  // a learner has completed a single quiz of a multi-week course,
  // `enrollmentReports.overallProgress` rounds to 0 — the ring sits at 0%
  // even though they have genuine engagement. The gradebook endpoint
  // returns finer-grained item-level percentages (e.g. 9% for "first quiz
  // done"), so we merge whichever signal is higher and feed it through the
  // existing `computeCourseProgressUpdate` ladder (which handles the no-
  // downgrade rules described in `b4bSync.ts`).
  //
  // We also pick up gradebook-only courses (a courseId that appears in the
  // gradebook fetch but not in the per-program enrollmentReports loop —
  // happens when Coursera lags rolling a fresh enrollment into the program-
  // wide enrollmentReports view). They still resolve through the same
  // catalog mapping.
  //
  // TODO(persist-learning-hrs): once we add `CourseProgress.totalLearningHours`
  // (Float?) we'll persist `gradebookRow.approxTotalLearningHrs` here. Held
  // back from this PR to avoid expanding scope into a Prisma migration; the
  // value is still surfaced through `courseGradebookReports` for the
  // cohort-hours dashboard backlog item.
  let courseProgressUpserted = 0;

  // Build a map keyed by courseraContentId so we don't double-process a
  // course that appeared in BOTH enrollmentReports and gradebook.
  type PerCourseSignal = {
    contentId: string;
    wapProgramSlug: string;
    wapCourseSlug: string;
    enrollment: {
      isCompleted: boolean;
      overallProgress: number | null;
      lastActivityAt: number | null;
    } | null;
    gradebook: {
      overallProgress: number | null;
      lastActivityAt: number | null;
    } | null;
  };
  const perCourse = new Map<string, PerCourseSignal>();

  for (const row of resolved) {
    perCourse.set(row.courseraContentId, {
      contentId: row.courseraContentId,
      wapProgramSlug: row.wapProgramSlug,
      wapCourseSlug: row.wapCourseSlug,
      enrollment: {
        isCompleted: row.isCompleted,
        overallProgress: row.overallProgress,
        lastActivityAt: row.lastActivityAt,
      },
      gradebook: null,
    });
  }

  for (const [courseId, gbRow] of gradebookByCourseId.entries()) {
    const existing = perCourse.get(courseId);
    const gbSignal = {
      overallProgress:
        typeof gbRow.overallProgress === 'number' ? gbRow.overallProgress : null,
      lastActivityAt:
        typeof gbRow.lastActivityAt === 'number' ? gbRow.lastActivityAt : null,
    };
    if (existing) {
      existing.gradebook = gbSignal;
      continue;
    }
    // Gradebook-only course — try to resolve through the same DB-first
    // canonical mapping → static catalog ladder. If it doesn't resolve we
    // silently skip (gradebook can return courses outside the WAP catalog
    // when learners self-enroll in adjacent Coursera content the program
    // doesn't track).
    const match = resolveContentIdToWapCourse(courseId, canonicalMappings);
    if (!match) continue;
    perCourse.set(courseId, {
      contentId: courseId,
      wapProgramSlug: match.wapProgramSlug,
      wapCourseSlug: match.wapCourseSlug,
      enrollment: null,
      gradebook: gbSignal,
    });
  }

  for (const signal of perCourse.values()) {
    const merged = mergeB4BProgressSignals({
      enrollment: signal.enrollment,
      gradebook: signal.gradebook,
    });

    // Read-before-write: the ladder enforces "never downgrade an xAPI-credited
    // COMPLETED back to IN_PROGRESS, never lower percentComplete". See
    // `computeCourseProgressUpdate`'s doc-comment for the full rationale.
    // CourseProgress is FK-scoped via User.organizationId; not in
    // TENANT_SCOPED_MODELS so we use `prisma` directly (matches b4bSync.ts).
    const existing = await prisma.courseProgress.findUnique({
      where: {
        userId_programSlug_courseSlug: {
          userId: args.wapUserId,
          programSlug: signal.wapProgramSlug,
          courseSlug: signal.wapCourseSlug,
        },
      },
      select: {
        status: true,
        percentComplete: true,
        lastActivityAt: true,
        scoreScaled: true,
      },
    });

    const update = computeCourseProgressUpdate(existing, merged);

    // Fire analytics milestones when progress crosses 25/50/75/100 thresholds.
    const crossed = getMilestonesCrossed(existing?.percentComplete, update.percentComplete);
    for (const milestone of crossed) {
      trackLearningMilestoneServer(args.wapUserId, milestone, signal.wapCourseSlug, {
        programSlug: signal.wapProgramSlug,
        source: 'b4b_sync',
      });
    }

    const gbRow = gradebookByCourseId.get(signal.contentId);
    const gbGradeScaled = gbRow ? extractGradebookCourseScoreScaled(gbRow) : null;

    // `completedAt` is set the first time we see COMPLETED. If we've already
    // recorded one we keep it — re-syncs shouldn't re-stamp the timestamp.
    const completedAt =
      update.status === CourseProgressStatus.COMPLETED &&
      existing?.status !== CourseProgressStatus.COMPLETED
        ? new Date()
        : null;

    try {
      await prisma.courseProgress.upsert({
        where: {
          userId_programSlug_courseSlug: {
            userId: args.wapUserId,
            programSlug: signal.wapProgramSlug,
            courseSlug: signal.wapCourseSlug,
          },
        },
        create: {
          userId: args.wapUserId,
          programSlug: signal.wapProgramSlug,
          courseSlug: signal.wapCourseSlug,
          courseId: signal.contentId,
          status: update.status,
          percentComplete: update.percentComplete,
          ...(gbGradeScaled != null ? { scoreScaled: gbGradeScaled } : {}),
          completedAt,
          lastActivityAt: update.lastActivityAt,
        },
        update: {
          courseId: signal.contentId,
          status: update.status,
          percentComplete: update.percentComplete,
          ...(gbGradeScaled != null ? { scoreScaled: gbGradeScaled } : {}),
          // Set completedAt on the transition into COMPLETED; never clear it.
          ...(update.status === CourseProgressStatus.COMPLETED &&
          existing?.status !== CourseProgressStatus.COMPLETED
            ? { completedAt: completedAt ?? new Date() }
            : {}),
          lastActivityAt: update.lastActivityAt,
        },
      });
      courseProgressUpserted += 1;
    } catch (err) {
      console.warn(
        `[syncUserFromB4B] courseProgress upsert failed for user=${args.wapUserId} course=${signal.wapCourseSlug}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  // ────────── 4. Replay xAPI for this identity ──────────
  let xapiReplayed = 0;
  let xapiCredited = 0;
  try {
    const replay = await replayUnresolvedXapiStatementsForIdentity({
      courseraEmail: email,
      actorIdentifier: null,
    });
    xapiReplayed = replay.replayed;
    xapiCredited = replay.breakdown.completedOk + replay.breakdown.ignored;
  } catch (err) {
    // Replay failure shouldn't undo the enrollment we just seeded.
    console.warn(
      `[syncUserFromB4B] xAPI replay failed for email=${email}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // ────────── 4.5. Partner / employer rollups + render-path cache ──────────
  //
  // `CourseProgress` rows alone don't update `MemberProgramProgress`; partner
  // referred-member and employer candidate views read the rollup. Bulk B4B
  // cron calls `updateRollups`, but per-user sync must rebuild too.
  try {
    const slugRows = await prisma.courseProgress.findMany({
      take: 5000,
      where: { userId: args.wapUserId },
      select: { programSlug: true },
      distinct: ['programSlug'],
    });
    for (const row of slugRows) {
      await refreshMemberProgramProgressRollup(args.wapUserId, row.programSlug);
    }
  } catch (err) {
    console.warn(
      `[syncUserFromB4B] MemberProgramProgress rollup refresh failed for user=${args.wapUserId}:`,
      err instanceof Error ? err.message : err,
    );
  }
  invalidateLearnerProgressCacheForEmail(email);

  // ────────── 5. Build summary ──────────
  const messageParts: string[] = [];
  if (programGroups.size === 0) {
    messageParts.push('No matching WAP program found for any Coursera enrollment row.');
  } else {
    const otherSlugs = enrolledProgramSlugs.filter((s) => s !== chosenProgramSlug);
    const primaryFragment = `Primary CourseEnrollment is "${chosenProgramSlug}".`;
    const secondaryFragment =
      otherSlugs.length > 0
        ? ` Also seeded/updated secondary enrollment(s): ${otherSlugs.map((s) => `"${s}"`).join(', ')}.`
        : '';
    if (seededEnrollments > 0 || updatedEnrollments > 0) {
      messageParts.push(
        `Seeded ${seededEnrollments} and updated ${updatedEnrollments} CourseEnrollment row(s). ${primaryFragment}${secondaryFragment}`,
      );
    } else {
      messageParts.push(`CourseEnrollments already up to date. ${primaryFragment}${secondaryFragment}`);
    }
  }
  if (droppedNoMapping.length > 0) {
    messageParts.push(
      `${droppedNoMapping.length} Coursera contentId(s) had no catalog mapping (TODO_courseId placeholders or unknown courses).`,
    );
  }
  if (courseProgressUpserted > 0) {
    messageParts.push(
      `Upserted ${courseProgressUpserted} CourseProgress row(s) from merged enrollment+gradebook signal.`,
    );
  }
  messageParts.push(
    `Replayed ${xapiReplayed} xAPI statement(s); ${xapiCredited} now credited.`,
  );

  return {
    ok: true,
    wapUserId: args.wapUserId,
    coursera: {
      programsChecked: programs.length,
      enrollmentReportsFound: enrollmentReports.length,
      gradebookReportsFound: gradebookReports.length,
    },
    mapped: {
      seededEnrollments,
      updatedEnrollments,
      primaryProgramSlug: chosenProgramSlug,
      enrolledProgramSlugs,
      droppedNoMapping,
      courseProgressUpserted,
    },
    xapi: {
      statementsReplayed: xapiReplayed,
      nowCredited: xapiCredited,
    },
    message: messageParts.join(' '),
  };
}

/** Stamp `users.last_coursera_auto_sync_at` so the dashboard auto-sync trigger
 *  knows to skip on subsequent renders. Called by the self auto-sync route
 *  AFTER `syncUserFromB4B` returns; the admin sync route does NOT touch this
 *  column (an admin-driven sync shouldn't burn the user's auto-sync slot).
 *  `orgId` MUST be the same tenant the user belongs to — callers always know
 *  it (they computed it from `getActorOrganizationId`), so we require it here
 *  to keep this write inside `withTenantScope`. */
export async function markUserAutoSynced(args: {
  userId: string;
  orgId: string;
}): Promise<void> {
  await withTenantScope(args.orgId, (db) =>
    db.user.update({
      where: { id: args.userId },
      data: { lastCourseraAutoSyncAt: new Date() },
    }),
  );
}
