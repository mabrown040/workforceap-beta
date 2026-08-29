import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { resolveAdminPageTenant, withAdminPageScope, inheritUserOrg, inheritMemberOrg, inheritLeaderOrg, inheritInvitedByOrg } from '@/lib/tenant/adminPageScope';
import { prisma } from '@/lib/db/prisma';
import { ADMIN_SSR_LIST_CAP, showingFirstLabel } from '@/lib/db/queryCaps';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import { getProgramBySlug, PROGRAMS } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import { parseCourseGradeString, scoreScaledToDisplayPercent } from '@/lib/coursera/courseGradeDisplay';
import { loadValidatedProgramCourses } from '@/lib/coursera/programCourseList';
import { reconcileProgramProgress } from '@/lib/coursera/progressReconciliation';
import { humanizeCourseraCourseTitle } from '@/lib/coursera/courseTitle';
import { countUnmatchedLearners, loadUnmatchedLearners } from '@/lib/coursera/progressQueries';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import TrainingProgressClient, {
  type CurriculumRow,
  type RawCourseraRow,
} from '@/components/admin/TrainingProgressClient';
import {
  TrainingProgressKit,
  type TrainingRow,
  type Pace,
} from '@/components/portal/kit/pages/admin-subviews/TrainingProgressKit';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Training progress',
    description:
      'Per-learner training progress across both the canonical curriculum and raw Coursera enrollments. Sortable.',
    path: '/admin/training-progress',
  });
}

export const dynamic = 'force-dynamic';

/** Members idle this long (with incomplete work) count as Stalled. */
const STALLED_IDLE_DAYS = 21;

export default async function AdminTrainingProgressPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/training-progress');
  const scope = await resolveAdminPageTenant(user.id);
  if (!scope.ok) redirect('/dashboard');
  const readOnlyAudit = isReadOnlyPortalAuditHeader(await headers());

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // ─── Legacy: the original sortable dual-table (canonical + raw Coursera) ───
  if (requestedUi === 'legacy') {
    return renderLegacy(scope);
  }

  // ─── DEFAULT: lean per-learner pace roster (design kit) ───
  // One pass over members + their primary enrollment + canonical course
  // progress. All lean (findMany take:N / count); no $transaction, no HTTP.
  let learners: Array<{
    id: string;
    fullName: string | null;
    enrolledProgram: string | null;
  }>;
  let learnerTotal = 0;
  try {
    [learners, learnerTotal] = await Promise.all([
      withAdminPageScope(scope, (db) => db.user.findMany({
        take: ADMIN_SSR_LIST_CAP,
        where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
        orderBy: [{ fullName: 'asc' }],
        select: { id: true, fullName: true, enrolledProgram: true },
      })),
      withAdminPageScope(scope, (db) => db.user.count({
        where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
      })),
    ]);
  } catch (error) {
    console.error('[admin/training-progress] learner load failed', error);
    redirect('/admin/training-progress?ui=legacy');
  }

  // Resolve the tenant-owned learner set before loading progress. A global
  // take cap is not a tenant boundary: another organization's rows could
  // otherwise consume the cap or appear in this admin roster.
  const learnerIds = learners.map((learner) => learner.id);
  const [enrollmentsResult, progressResult] = await Promise.allSettled([
    // Primary program per learner drives the single pace row we show.
    withAdminPageScope(scope, (db) => db.courseEnrollment.findMany({
      where: { isPrimary: true, userId: { in: learnerIds } },
      select: { userId: true, programSlug: true },
    })),
    prisma.courseProgress.findMany({
      where: { userId: { in: learnerIds } },
      select: {
        userId: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        scoreScaled: true,
        lastActivityAt: true,
        lastUpdatedAt: true,
      },
    }),
  ]);

  let trainingSecondaryLoadFailed = false;

  // Primary program per learner (falls back to legacy User.enrolledProgram
  // when no CourseEnrollment row exists yet — e.g. seeded users).
  const primaryByUser = new Map<string, string>();
  if (enrollmentsResult.status === 'fulfilled') {
    for (const e of enrollmentsResult.value) {
      if (!primaryByUser.has(e.userId)) primaryByUser.set(e.userId, e.programSlug);
    }
  } else {
    trainingSecondaryLoadFailed = true;
    console.error(
      '[admin/training-progress] enrollment load failed',
      enrollmentsResult.reason,
    );
  }

  // Canonical program buckets feed the same reconciliation helper used by
  // the member portal. Missing joins remain observable facts instead of an
  // inline `?? 0` shortcut with a different formula.
  type AdminLocalProgressRow = {
    courseSlug: string;
    courseId: string | null;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
    percentComplete: number;
  };
  const progressByUserProgram = new Map<string, AdminLocalProgressRow[]>();
  const lastActivityByUserProgram = new Map<string, Date>();
  const inferredProgramByUser = new Map<
    string,
    { programSlug: string; activityMs: number; percentComplete: number }
  >();
  const gradeByUserId = new Map<string, number>();
  if (progressResult.status === 'fulfilled') {
    for (const p of progressResult.value) {
      const canonicalProgramSlug =
        getProgramBySlug(p.programSlug)?.slug ?? canonicalizeProgramSlug(p.programSlug);
      const userProgramKey = `${p.userId}:${canonicalProgramSlug}`;
      const bucket = progressByUserProgram.get(userProgramKey) ?? [];
      bucket.push({
        courseSlug: p.courseSlug,
        courseId: p.courseId,
        status: p.status,
        percentComplete: p.percentComplete,
      });
      progressByUserProgram.set(userProgramKey, bucket);
      const activityAt = p.lastActivityAt ?? p.lastUpdatedAt;
      if (activityAt) {
        const cur = lastActivityByUserProgram.get(userProgramKey);
        if (!cur || activityAt > cur) {
          lastActivityByUserProgram.set(userProgramKey, activityAt);
        }
      }
      const inferred = inferredProgramByUser.get(p.userId);
      const activityMs = activityAt?.getTime() ?? 0;
      if (
        !inferred ||
        activityMs > inferred.activityMs ||
        (activityMs === inferred.activityMs && p.percentComplete > inferred.percentComplete)
      ) {
        inferredProgramByUser.set(p.userId, {
          programSlug: canonicalProgramSlug,
          activityMs,
          percentComplete: p.percentComplete,
        });
      }
      if (!gradeByUserId.has(p.userId)) {
        const pct = scoreScaledToDisplayPercent(p.scoreScaled);
        if (pct != null) gradeByUserId.set(p.userId, pct);
      }
    }
  } else {
    trainingSecondaryLoadFailed = true;
    console.error(
      '[admin/training-progress] progress load failed',
      progressResult.reason,
    );
  }

  const programSlugs = Array.from(
    new Set(
      learners
        .map(
          (learner) =>
            primaryByUser.get(learner.id) ??
            learner.enrolledProgram ??
            inferredProgramByUser.get(learner.id)?.programSlug,
        )
        .filter((value): value is string => Boolean(value))
        .map((programSlug) => getProgramBySlug(programSlug)?.slug)
        .filter((programSlug): programSlug is string => Boolean(programSlug)),
    ),
  );
  const validatedCourseLists = new Map(
    await Promise.all(
      programSlugs.map(async (programSlug) => {
        const result = await loadValidatedProgramCourses({
          organizationId: scope.orgId,
          programSlug,
          readOnlyAudit,
          checkB4BContents: false,
        });
        return [programSlug, result.courses] as const;
      }),
    ),
  );

  const idleCutoff = new Date();
  idleCutoff.setDate(idleCutoff.getDate() - STALLED_IDLE_DAYS);

  /**
   * Pace heuristic (lean — derived from % complete + recency):
   *   Ahead    → ≥ 85% complete (and not yet fully done counts as ahead too)
   *   Stalled  → incomplete AND no activity in the idle window (or never active)
   *   Behind   → < 40% complete but recently active
   *   On track → everything else
   */
  function derivePace(percent: number, lastActivity: Date | undefined): Pace {
    const complete = percent >= 100;
    if (percent >= 85) return 'Ahead';
    if (!complete && (!lastActivity || lastActivity < idleCutoff)) return 'Stalled';
    if (percent < 40) return 'Behind';
    return 'On track';
  }

  const rows: TrainingRow[] = [];
  for (const learner of learners) {
    const storedProgramSlug = primaryByUser.get(learner.id) ?? learner.enrolledProgram;
    const inferredProgramSlug = inferredProgramByUser.get(learner.id)?.programSlug;
    const displayProgramSlug = storedProgramSlug ?? inferredProgramSlug;
    if (!displayProgramSlug) continue;
    const program = getProgramBySlug(displayProgramSlug);
    if (!program || program.courses.length === 0) continue;
    const programSlug = program.slug;
    const validatedCourses = validatedCourseLists.get(programSlug) ?? program.courses;
    const reconciliation = reconcileProgramProgress({
      validatedCourses,
      localRows: progressByUserProgram.get(`${learner.id}:${programSlug}`) ?? [],
    });
    const percentComplete = reconciliation.programPercent;
    const lastActivity = lastActivityByUserProgram.get(`${learner.id}:${programSlug}`);

    rows.push({
      id: `${learner.id}:${programSlug}`,
      student: learner.fullName?.trim() || 'Unnamed learner',
      program: program.title,
      modulesDone: reconciliation.completedCount,
      modulesTotal: reconciliation.totalCourses,
      percentComplete,
      pace: derivePace(percentComplete, lastActivity),
      inWap: true,
      noProgram: !storedProgramSlug,
      courseraGrade: gradeByUserId.get(learner.id) ?? null,
    });
  }

  // Sort most-complete first so the live, healthy learners lead.
  rows.sort((a, b) => b.percentComplete - a.percentComplete);

  const [unmatchedLearners, unmatchedLearnerTotal] = await Promise.all([
    loadUnmatchedLearners(scope.orgId, ADMIN_SSR_LIST_CAP, {
      includeTestAccounts: false,
    }).catch((reason: unknown) => {
      trainingSecondaryLoadFailed = true;
      console.error('[admin/training-progress] unmatched Coursera learners failed', reason);
      return [];
    }),
    countUnmatchedLearners(scope.orgId, { includeTestAccounts: false }).catch(
      (reason: unknown) => {
        trainingSecondaryLoadFailed = true;
        console.error('[admin/training-progress] unmatched Coursera count failed', reason);
        return 0;
      },
    ),
  ]);
  for (const learner of unmatchedLearners) {
    const lastActivity = learner.lastActivityTime
      ? new Date(learner.lastActivityTime)
      : undefined;
    const percentComplete = learner.averageProgressPercent;
    rows.push({
      id: `coursera:${learner.externalEmail}`,
      student: learner.externalName?.trim() || learner.externalEmail,
      program: 'Coursera activity',
      modulesDone: learner.completedCourseCount,
      modulesTotal: learner.courseCount || 0,
      percentComplete,
      pace: derivePace(percentComplete, lastActivity),
      inWap: false,
      courseraGrade: learner.latestGradePercent,
    });
  }

  const onTrack = rows.filter((r) => r.pace === 'On track' || r.pace === 'Ahead').length;
  const behind = rows.filter((r) => r.pace === 'Behind').length;
  const stalled = rows.filter((r) => r.pace === 'Stalled').length;
  const avgPercent =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.percentComplete, 0) / rows.length)
      : 0;

  return (
    <>
      {trainingSecondaryLoadFailed ? (
        <span hidden data-portal-error-state="admin-training-progress-secondary-load" />
      ) : null}
      <TrainingProgressKit
        rows={rows}
        onTrack={onTrack}
        behind={behind}
        stalled={stalled}
        avgPercent={avgPercent}
        showingLabel={[
          showingFirstLabel(learners.length, learnerTotal, 'member records'),
          showingFirstLabel(
            unmatchedLearners.length,
            unmatchedLearnerTotal,
            'unmatched Coursera learners',
          ),
        ].join(' · ')}
      />
    </>
  );
}

/** Original sortable dual-table view (canonical curriculum + raw Coursera). */
async function renderLegacy(scope: import("@/lib/tenant/adminPageScope").AdminPageTenantOk) {
  const [learners, learnerTotal] = await Promise.all([
    withAdminPageScope(scope, (db) => db.user.findMany({
      take: ADMIN_SSR_LIST_CAP,
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
      orderBy: [{ fullName: 'asc' }],
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        profile: { select: { role: true } },
      },
    })),
    withAdminPageScope(scope, (db) => db.user.count({
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
    })),
  ]);

  const learnerIds = learners.map((l) => l.id);

  const [canonicalProgressRows, rawCourseraRows, rawCourseraTotal, courseEnrollmentRows] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: { in: learnerIds } },
      select: {
        userId: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        lastActivityAt: true,
        lastUpdatedAt: true,
        scoreScaled: true,
      },
    }),
    prisma.courseraCourseProgress.findMany({
      take: ADMIN_SSR_LIST_CAP,
      // Intentionally not filtered only by `userId in learnerIds`: we want to
      // surface every Coursera enrollment in this tenant — including rows whose
      // courseraEmail never matched a WAP user. Those orphans are exactly the
      // ones an admin needs to reconcile (matching `/admin/coursera`'s
      // unmatched-learners panel). The organization predicate is mandatory;
      // raw rows contain learner PII and must never cross tenant boundaries.
      where: { organizationId: scope.orgId },
      orderBy: [{ lastActivityTime: 'desc' }],
      select: {
        userId: true,
        externalEmail: true,
        externalName: true,
        courseraCourseId: true,
        courseraCourseSlug: true,
        courseName: true,
        university: true,
        programSlug: true,
        programName: true,
        overallProgress: true,
        courseGrade: true,
        learningHours: true,
        isCompleted: true,
        enrollmentTime: true,
        lastActivityTime: true,
        completionTime: true,
      },
    }),
    prisma.courseraCourseProgress.count({
      where: { organizationId: scope.orgId },
    }),
    // Multi-program: drive the curriculum view from EVERY enrollment row
    // (primary + secondary), not just `User.enrolledProgram`. The legacy
    // single-program field stays as a fallback below for users without any
    // CourseEnrollment rows yet (seeded test users).
    withAdminPageScope(scope, (db) => db.courseEnrollment.findMany({
      where: { userId: { in: learnerIds } },
      select: {
        userId: true,
        programSlug: true,
        isPrimary: true,
      },
    })),
  ]);

  const rawCourseraIds = Array.from(
    new Set(rawCourseraRows.map((row) => row.courseraCourseId).filter(Boolean)),
  );
  const dbMappings = rawCourseraIds.length > 0
    ? await prisma.courseraCanonicalCourseMapping.findMany({
        where: { courseraCourseId: { in: rawCourseraIds } },
        select: {
          courseraCourseId: true,
          canonicalProgramSlug: true,
          canonicalCourseSlug: true,
        },
      })
    : [];

  const dbMappingByCourseraId = new Map(
    dbMappings.map((m) => [m.courseraCourseId, m]),
  );

  const canonicalByKey = new Map<string, (typeof canonicalProgressRows)[number]>();
  const statusRank = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 } as const;
  for (const row of canonicalProgressRows) {
    const canonicalProgramSlug = canonicalizeProgramSlug(row.programSlug);
    const key = `${row.userId}:${canonicalProgramSlug}:${row.courseSlug}`;
    const current = canonicalByKey.get(key);
    if (!current) {
      canonicalByKey.set(key, row);
      continue;
    }
    const status = statusRank[current.status] >= statusRank[row.status]
      ? current.status
      : row.status;
    const stronger = statusRank[current.status] >= statusRank[row.status] ? current : row;
    canonicalByKey.set(key, {
      ...stronger,
      programSlug: canonicalProgramSlug,
      status,
      percentComplete:
        status === 'COMPLETED'
          ? 100
          : Math.max(current.percentComplete, row.percentComplete),
      courseId: current.courseId ?? row.courseId,
      lastActivityAt:
        !current.lastActivityAt || (row.lastActivityAt && row.lastActivityAt > current.lastActivityAt)
          ? row.lastActivityAt
          : current.lastActivityAt,
      lastUpdatedAt: row.lastUpdatedAt > current.lastUpdatedAt
        ? row.lastUpdatedAt
        : current.lastUpdatedAt,
    });
  }

  // Multi-program: bucket every CourseEnrollment row by user so we can
  // emit curriculum rows for primary + secondary programs in one pass.
  const enrollmentsByUser = new Map<string, typeof courseEnrollmentRows>();
  for (const row of courseEnrollmentRows) {
    const bucket = enrollmentsByUser.get(row.userId);
    if (bucket) bucket.push(row);
    else enrollmentsByUser.set(row.userId, [row]);
  }

  // Curriculum view: row per (learner × enrolled program × canonical course).
  // For multi-program learners we emit one block per enrolled program, in
  // this order: primary first, then each secondary alphabetically by program
  // title. The `programRole` field lets the client component show a
  // `secondary` pill on rows from non-primary programs.
  const curriculumRows: CurriculumRow[] = [];
  for (const learner of learners) {
    const learnerEnrollments = enrollmentsByUser.get(learner.id) ?? [];

    // Build the ordered list of programs to render for this learner. When
    // CourseEnrollment rows exist, they drive the view (primary first, then
    // secondaries alpha by program title). Otherwise fall back to the
    // legacy `User.enrolledProgram` so seeded users without a backfilled
    // enrollment row still get a curriculum block (treated as primary).
    type ProgramEmit = { programSlug: string; programRole: 'primary' | 'secondary' };
    let programsToEmit: ProgramEmit[] = [];

    if (learnerEnrollments.length > 0) {
      const primary = learnerEnrollments.find((e) => e.isPrimary) ?? null;
      const secondaries = learnerEnrollments
        .filter((e) => e !== primary)
        .map((e) => ({
          programSlug: e.programSlug,
          programTitle: getProgramBySlug(e.programSlug)?.title ?? e.programSlug,
        }))
        .sort((a, b) => a.programTitle.localeCompare(b.programTitle));

      if (primary) {
        programsToEmit.push({ programSlug: primary.programSlug, programRole: 'primary' });
      }
      for (const s of secondaries) {
        programsToEmit.push({ programSlug: s.programSlug, programRole: 'secondary' });
      }
    } else if (learner.enrolledProgram) {
      programsToEmit = [{ programSlug: learner.enrolledProgram, programRole: 'primary' }];
    }

    for (const { programSlug, programRole } of programsToEmit) {
      const program = getProgramBySlug(programSlug);
      if (!program) continue;
      const canonicalProgramSlug = program.slug;
      for (const course of program.courses) {
        const progress = canonicalByKey.get(`${learner.id}:${canonicalProgramSlug}:${course.slug}`);
        curriculumRows.push({
          key: `${learner.id}:${canonicalProgramSlug}:${course.slug}`,
          learnerId: learner.id,
          learnerName: learner.fullName ?? '',
          learnerEmail: learner.email ?? '',
          learnerRole: learner.profile?.role ?? 'member',
          programSlug: canonicalProgramSlug,
          programTitle: program.title,
          programRole,
          courseSlug: course.slug,
          courseName: course.name,
          courseraCourseId: progress?.courseId ?? course.courseraCourseId ?? null,
          status: progress?.status ?? 'NOT_STARTED',
          percentComplete: progress?.percentComplete ?? 0,
          gradePercent: scoreScaledToDisplayPercent(progress?.scoreScaled),
          lastActivityAt: progress?.lastActivityAt?.toISOString() ?? null,
          lastUpdatedAt: progress?.lastUpdatedAt?.toISOString() ?? null,
        });
      }
    }
  }

  // Raw Coursera view: row per (learner × actual Coursera course they're in)
  // Mapping resolution order:
  //   1. DB-curated mapping in coursera_canonical_course_mappings (admin-edited)
  //   2. Static program-def mapping via courseraCourseId / slug
  //   3. Unmapped — surface the inline "Map this" form in the UI
  const learnersById = new Map(learners.map((l) => [l.id, l]));
  const rawRows: RawCourseraRow[] = rawCourseraRows.map((row) => {
    const learner = row.userId ? learnersById.get(row.userId) : null;
    let mappedProgramSlug: string | null = null;
    let mappedCourseSlug: string | null = null;
    let mappingSource: 'db' | 'static' | null = null;

    const dbMatch = dbMappingByCourseraId.get(row.courseraCourseId);
    if (dbMatch) {
      mappedProgramSlug = dbMatch.canonicalProgramSlug;
      mappedCourseSlug = dbMatch.canonicalCourseSlug;
      mappingSource = 'db';
    } else if (learner?.enrolledProgram) {
      const program = getProgramBySlug(learner.enrolledProgram);
      const match = program?.courses.find(
        (c) =>
          (c.courseraCourseId && c.courseraCourseId === row.courseraCourseId) ||
          (row.courseraCourseSlug && c.slug === row.courseraCourseSlug),
      );
      if (match) {
        mappedProgramSlug = learner.enrolledProgram;
        mappedCourseSlug = match.slug;
        mappingSource = 'static';
      }
    }
    return {
      key: `${row.userId ?? row.externalEmail}:${row.courseraCourseId}`,
      learnerId: row.userId,
      // When a learner's Coursera email never matched a WAP user, fall back
      // to the externalName from the Coursera CSV/API so the row is still
      // identifiable in the table — and flag the identity gap explicitly.
      learnerName: learner?.fullName ?? row.externalName ?? null,
      learnerEmail: learner?.email ?? row.externalEmail,
      learnerRole: learner?.profile?.role ?? null,
      identityMatched: Boolean(learner),
      courseraCourseId: row.courseraCourseId,
      courseraCourseSlug: row.courseraCourseSlug,
      courseName: humanizeCourseraCourseTitle(row.courseName, row.courseraCourseSlug),
      university: row.university,
      courseraProgramSlug: row.programSlug,
      courseraProgramName: row.programName,
      mappedProgramSlug,
      mappedCourseSlug,
      mappingSource,
      suggestedProgramSlug: learner?.enrolledProgram ?? null,
      percentComplete: Number(row.overallProgress),
      gradePercent: parseCourseGradeString(row.courseGrade),
      learningHours: Number(row.learningHours),
      isCompleted: row.isCompleted,
      enrollmentTime: row.enrollmentTime?.toISOString() ?? null,
      lastActivityTime: row.lastActivityTime?.toISOString() ?? null,
      completionTime: row.completionTime?.toISOString() ?? null,
    };
  });

  // Catalog of canonical (programSlug, courseSlug, courseName) options the
  // client can offer in the "Map this" dropdown. Built from the static
  // program definitions in lib/content/programs.ts.
  const canonicalCatalog = PROGRAMS.map((program) => ({
    programSlug: program.slug,
    programTitle: program.title,
    courses: program.courses.map((c) => ({
      slug: c.slug,
      name: c.name,
      courseraCourseId: c.courseraCourseId ?? null,
    })),
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Training progress"
        subtitle="All learners across both canonical curriculum (DB course_progress) and raw Coursera enrollments (coursera_course_progress). Sort any column."
      />
      <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
        {showingFirstLabel(learners.length, learnerTotal, 'member records')} ·{' '}
        {showingFirstLabel(rawCourseraRows.length, rawCourseraTotal, 'raw Coursera rows')}
      </p>
      <TrainingProgressClient
        curriculumRows={curriculumRows}
        rawRows={rawRows}
        canonicalCatalog={canonicalCatalog}
      />
    </PortalPageFrame>
  );
}
