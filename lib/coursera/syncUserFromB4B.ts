import 'server-only';

import {
  getCourseGradebookReports,
  getEnrollmentReports,
  listPrograms,
  type B4BEnrollmentReport,
  type B4BGradebookReport,
} from './b4bClient';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { replayUnresolvedXapiStatementsForIdentity } from './replayPendingXapi';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

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
  courseraProgramId: string;
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
  };
  xapi: {
    statementsReplayed: number;
    nowCredited: number;
  };
  message: string;
};

/**
 * Look up a Coursera contentId across the entire DISCOVERED_COURSERA_PROGRAMS
 * catalog. Returns the (wapProgramSlug, courseSlug) the contentId belongs to,
 * or null if no entry matches. Catalog rows with `TODO_courseId_*` placeholder
 * courseIds will never match a real Coursera contentId.
 */
export function resolveContentIdToWapCourse(
  contentId: string,
): { wapProgramSlug: string; wapCourseSlug: string; courseraProgramId: string } | null {
  const needle = contentId.trim();
  if (!needle || needle.startsWith('TODO_')) return null;

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

  const enrollmentReports: B4BEnrollmentReport[] = [];
  for (const program of programs) {
    try {
      const page = await getEnrollmentReports({
        byUserProgramId: true,
        programId: program.id,
        externalId: email,
        limit: 200,
      });
      enrollmentReports.push(...page.elements);
    } catch (err) {
      // Per-program failure shouldn't sink the whole sync; log and continue.
      console.warn(
        `[syncUserFromB4B] enrollmentReports failed for program=${program.id} email=${email}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  let gradebookReports: B4BGradebookReport[] = [];
  try {
    const page = await getCourseGradebookReports({
      emailOrExternalId: email,
      limit: 200,
    });
    gradebookReports = page.elements;
  } catch (err) {
    console.warn(
      `[syncUserFromB4B] gradebook fetch failed for email=${email}:`,
      err instanceof Error ? err.message : err,
    );
  }

  // ────────── 2. Map Coursera contentIds → WAP (programSlug, courseSlug) ──────
  const resolved: ResolvedCourse[] = [];
  const droppedNoMapping: DroppedItem[] = [];
  const seenDropped = new Set<string>();

  for (const report of enrollmentReports) {
    const contentId = (report.contentId ?? '').trim();
    if (!contentId) continue;
    const match = resolveContentIdToWapCourse(contentId);
    if (!match) {
      if (!seenDropped.has(contentId)) {
        seenDropped.add(contentId);
        droppedNoMapping.push({
          courseraContentId: contentId,
          reason:
            'No DISCOVERED_COURSERA_PROGRAMS entry has a course with this courseId (likely a TODO_courseId_* placeholder or unmapped catalog entry).',
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
