import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import {
  getCourseGradebookReports,
  getEnrollmentReports,
  listPrograms,
  type B4BEnrollmentReport,
  type B4BGradebookReport,
} from '@/lib/coursera/b4bClient';
import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { replayUnresolvedXapiStatementsForIdentity } from '@/lib/coursera/replayPendingXapi';
import { prisma } from '@/lib/db/prisma';
import { captureApiError } from '@/lib/observability/captureApiError';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';

/**
 * POST /api/admin/coursera/sync-user-from-b4b
 *
 * Body: { email: string }
 *
 * Pulls authoritative enrollment data for a single learner from Coursera For
 * Business and seeds matching `CourseEnrollment` rows in WAP, then replays any
 * unprocessed xAPI statements for that learner. This closes the gap where
 * Coursera knows about the learner but WAP has no enrollment row to credit
 * progress against (so xAPI events bounce with `No program enrolled`).
 *
 * Auth: super_admin OR admin in the actor's org.
 *
 * Behavior:
 *   1. Locate the WAP user by email (case-insensitive) within the actor's org.
 *      If absent, returns 404 — caller should use `/reconcile/add-to-wap`
 *      first. We never auto-provision a WAP account here.
 *   2. Iterate the org's Coursera programs (`listPrograms`) and call
 *      `getEnrollmentReports({ q: 'byUserProgramId', programId, externalId })`
 *      per program. Also pull `getCourseGradebookReports` filtered by email.
 *   3. For each enrollmentReport's `contentId`, look it up in
 *      `DISCOVERED_COURSERA_PROGRAMS` to find the (wapProgramSlug, courseSlug).
 *      Catalog rows whose `courseId` is still a `TODO_courseId_*` placeholder
 *      will never match a real Coursera contentId and are surfaced in
 *      `mapped.droppedNoMapping` so an operator can update the catalog later.
 *   4. Upsert one `CourseEnrollment` row PER matched program (multi-program
 *      support — see prisma/migrations/.../multi_course_enrollment). The
 *      program with the strongest Coursera signal (most matched courses,
 *      ties broken by most-recent activity) is marked `isPrimary = true`,
 *      others as secondary. If the user already has an `enrolledProgram` set
 *      and that program is one of the Coursera matches, we keep it as
 *      primary so we don't accidentally flip a learner away from the
 *      program they registered for. `User.enrolledProgram` is then pinned
 *      to the primary slug so the xAPI pipeline keeps crediting (see
 *      `lib/xapi/inboundStatementPipeline.ts` — multi-program xAPI
 *      crediting is deferred to a later PR).
 *   5. Call `replayUnresolvedXapiStatementsForIdentity` (per-identity, never
 *      global) to drain the learner's stuck xAPI statements.
 *   6. Return a structured summary the UI can show as a toast.
 */

const bodySchema = z.object({
  email: z.string().email().max(320),
});

type DroppedItem = {
  courseraContentId: string;
  reason: string;
};

type ResolvedCourse = {
  courseraContentId: string;
  wapProgramSlug: string;
  wapCourseSlug: string;
  courseraProgramId: string;
  isCompleted: boolean;
  overallProgress: number | null;
  lastActivityAt: number | null;
};

type SyncResponse = {
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
    /** Slug of the row marked `isPrimary = true` after the sync. */
    primaryProgramSlug: string | null;
    /** All program slugs the user is now enrolled in (primary + secondary). */
    enrolledProgramSlugs: string[];
    droppedNoMapping: DroppedItem[];
  };
  xapi: {
    statementsReplayed: number;
    nowCredited: number;
  };
  message: string;
};

function normEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

/**
 * Look up a Coursera contentId across the entire DISCOVERED_COURSERA_PROGRAMS
 * catalog. Returns the (wapProgramSlug, courseSlug) the contentId belongs to,
 * or null if no entry matches. Catalog rows with `TODO_courseId_*` placeholder
 * courseIds will never match a real Coursera contentId — those Coursera rows
 * fall through and are recorded in `droppedNoMapping`.
 */
function resolveContentIdToWapCourse(
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

export async function POST(request: NextRequest) {
  const actor = await getUser();
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let orgId: string;
  try {
    orgId = await getActorOrganizationId(actor.id);
  } catch (err) {
    captureApiError(err, { route: 'admin/coursera/sync-user-from-b4b' });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const superAdmin = await isSuperAdmin(actor.id);
  if (!superAdmin && !(await isAdminInOrg(actor.id, orgId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }
  const email = normEmail(parsed.data.email);

  // ────────── 1. Find the WAP user (tenant-scoped) ──────────
  const wapUser = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: {
        deletedAt: null,
        email: { equals: email, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
        enrolledProgram: true,
      },
    }),
  );

  if (!wapUser) {
    return NextResponse.json(
      {
        error:
          'user does not exist in WAP — use Add to WAP first',
      },
      { status: 404 },
    );
  }

  // ────────── 2. Pull authoritative data from Coursera ──────────
  // The B4B enrollmentReports endpoint requires a programId for the
  // byUserProgramId query mode. We don't know up front which Coursera program
  // the learner is in, so iterate the org's programs and ask each one. The
  // org currently runs a single B4B program ("TpIlAogTQ8-SJQKIE8PP9w"), but
  // listPrograms() future-proofs this against multi-program orgs.
  let programs: Array<{ id: string; name: string }> = [];
  try {
    const page = await listPrograms({ excludeContent: true, limit: 100 });
    programs = page.elements.map((p) => ({ id: p.id, name: p.name }));
  } catch (err) {
    captureApiError(err, {
      route: 'admin/coursera/sync-user-from-b4b',
      extra: { stage: 'listPrograms' },
    });
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Coursera listPrograms failed: ${err.message}`
            : 'Coursera listPrograms failed',
      },
      { status: 502 },
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
      captureApiError(err, {
        route: 'admin/coursera/sync-user-from-b4b',
        extra: { stage: 'getEnrollmentReports', programId: program.id },
      });
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
    // Gradebook is informational here; failure is non-fatal.
    captureApiError(err, {
      route: 'admin/coursera/sync-user-from-b4b',
      extra: { stage: 'getCourseGradebookReports' },
    });
  }

  // ────────── 3. Map Coursera contentIds → WAP (programSlug, courseSlug) ──────────
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

  // Group by wapProgramSlug so we can score each candidate program for the
  // primary-enrollment slot. Score = number of matched courses; ties broken
  // by most-recent activity.
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

  // ────────── 4. Seed/upsert CourseEnrollment per matched program ──────────
  // Multi-program: write one row per matched program, mark exactly one as
  // primary. The partial unique index `course_enrollments_user_primary_uidx`
  // enforces the at-most-one invariant — we transitionally clear other rows
  // first, then set the chosen primary, to avoid violating it mid-update.
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
      ([slug]) => slug === wapUser.enrolledProgram,
    );
    chosenProgramSlug = (existingMatch ?? candidates[0])![0];

    const enrolledAt = new Date();

    // Clear is_primary on every existing row for this user up front. The
    // partial unique index would reject a second is_primary=true without
    // this, and we may be moving primary to a different slug.
    await withTenantScope(orgId, (db) =>
      db.courseEnrollment.updateMany({
        where: { userId: wapUser.id, isPrimary: true },
        data: { isPrimary: false },
      }),
    );

    for (const [slug] of candidates) {
      enrolledProgramSlugs.push(slug);
      const isPrimary = slug === chosenProgramSlug;
      const existingRow = await withTenantScope(orgId, (db) =>
        db.courseEnrollment.findUnique({
          where: { userId_programSlug: { userId: wapUser.id, programSlug: slug } },
          select: { id: true },
        }),
      );

      if (!existingRow) {
        await withTenantScope(orgId, (db) =>
          db.courseEnrollment.create({
            data: {
              organizationId: orgId,
              userId: wapUser.id,
              programSlug: slug,
              isPrimary,
              enrolledAt,
              enrolledByAdminId: actor.id,
            },
          }),
        );
        seededEnrollments += 1;
      } else {
        await withTenantScope(orgId, (db) =>
          db.courseEnrollment.update({
            where: { userId_programSlug: { userId: wapUser.id, programSlug: slug } },
            data: {
              isPrimary,
              enrolledByAdminId: actor.id,
            },
          }),
        );
        updatedEnrollments += 1;
      }
    }

    // Pin User.enrolledProgram too — the xAPI pipeline reads this field
    // (not CourseEnrollment) when deciding whether to credit a statement.
    // Multi-program xAPI crediting is deferred (see header comment).
    if (wapUser.enrolledProgram !== chosenProgramSlug) {
      await withTenantScope(orgId, (db) =>
        db.user.update({
          where: { id: wapUser.id },
          data: {
            enrolledProgram: chosenProgramSlug!,
            enrolledAt: wapUser.enrolledProgram ? undefined : enrolledAt,
          },
        }),
      );
    }
  }

  // ────────── 5. Replay xAPI for this identity ──────────
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
    captureApiError(err, {
      route: 'admin/coursera/sync-user-from-b4b',
      extra: { stage: 'replayUnresolvedXapiStatementsForIdentity' },
    });
  }

  // ────────── 6. Build summary ──────────
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

  const response: SyncResponse = {
    ok: true,
    wapUserId: wapUser.id,
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

  return NextResponse.json(response);
}
