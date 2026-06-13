import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/auth/server';
import { isAdminInOrg, isSuperAdmin } from '@/lib/auth/roles';
import {
  getCourseGradebookReports,
  getEnrollmentReports,
  listAllUsers,
  type B4BEnrollmentReport,
  type B4BGradebookReport,
  type B4BUser,
} from '@/lib/coursera/b4bClient';
import { prisma } from '@/lib/db/prisma';
import { ensureCourseraMappingTables } from '@/lib/xapi/mappings';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { captureApiError } from '@/lib/observability/captureApiError';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/admin/coursera/inspect-by-email?email=<email>
 *
 * Admin-only "deep inspect" by email. Joins, in one response, every
 * system that knows about a given email so an operator can diagnose
 * the state of a single learner without hopping between five tabs.
 *
 * What it pulls:
 *   - WAP user + profile + roles + enrollments  (tenant-scoped)
 *   - coursera_identity_mappings rows           (mapping table)
 *   - Coursera roster (B4B listAllUsers)        (cap 1000 users)
 *   - Coursera enrollmentReports                (per-course progress)
 *   - Coursera courseGradebookReports           (per-course grading)
 *   - XapiStatement counts                      (local DB)
 *   - coursera_xapi_events unprocessed counts   (local DB)
 *
 * Then returns a clear `diagnosis: string[]` narrative explaining
 * the state in human terms (e.g. "User is a super-admin; no member-side
 * data on /dashboard is expected").
 *
 * Auth:
 *   - signed in
 *   - admin in the actor's organization (super_admin bypasses tenant)
 *
 * Pagination cap:
 *   - Coursera roster pagination capped at `ROSTER_PAGE_CAP` pages of
 *     1000 - if the email isn't found within that window we report
 *     `foundInRoster=false` plus a soft "did-not-find-within-cap" note
 *     in `diagnosis` rather than throwing.
 */

const DEFAULT_PROGRAM_ID = 'TpIlAogTQ8-SJQKIE8PP9w';
const ROSTER_PAGE_CAP = 1; // Each page is 1000; one page covers ≤1000 users.

type IdentityMappingRow = {
  id: string;
  courseraEmail: string | null;
  actorIdentifier: string | null;
  source: string;
  notes: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
};

type InspectResponse = {
  email: string;
  wap: {
    userId: string | null;
    fullName: string | null;
    organizationId: string | null;
    profileRole: string | null;
    extraRoles: string[];
    isMember: boolean;
    enrollments: Array<{
      courseId: string;
      programSlug: string;
      status: string;
      lastActivityAt: string | null;
    }>;
  };
  identityMappings: Array<{
    id: string;
    courseraEmail: string | null;
    actorIdentifier: string | null;
    source: string;
    notes: string | null;
    createdAt: string;
    lastSeenAt: string | null;
  }>;
  coursera: {
    foundInRoster: boolean;
    rosterEntry:
      | {
          externalId: string;
          fullName: string;
          membershipProgramIds: string[];
        }
      | null;
    enrollmentReports: Array<{
      programId: string;
      contentId: string;
      contentType: string;
      isCompleted: boolean;
      overallProgress: number | null;
      lastActivityAt: string | null;
    }>;
    gradebookReports: Array<{
      programId: string;
      courseId: string;
      collectionName: string;
      overallProgress: number;
      approxTotalLearningHrs: number;
      lastActivityAt: string | null;
    }>;
  };
  xapiActivity: {
    statementCount: number;
    latestStatementAt: string | null;
    unprocessedCount: number;
  };
  diagnosis: string[];
};

function normEmail(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function epochToIso(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  // B4B dates may be ms or seconds; treat 10-digit values as seconds.
  const ms = value < 1e12 ? value * 1000 : value;
  try {
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}export const GET = withApiGuc(async (request: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let orgId: string;
    try {
      orgId = await getActorOrganizationId(user.id);
    } catch (err) {
      captureApiError(err, { route: 'admin/coursera/inspect-by-email' });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await isAdminInOrg(user.id, orgId))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const rawEmail = url.searchParams.get('email') ?? '';
    const email = normEmail(rawEmail);
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Provide ?email=<address> with a valid email.' },
        { status: 400 },
      );
    }

    const programId =
      url.searchParams.get('programId')?.trim() ||
      process.env.COURSERA_PROGRAM_ID?.trim() ||
      DEFAULT_PROGRAM_ID;

    // ────────────── WAP side ──────────────
    // Tenant-scoped lookup against the actor's org. Use findFirst with case-
    // insensitive equals because the emails Coursera returns may not match
    // the case stored on the User row.
    const wapUser = await withTenantScope(orgId, (db) =>
      db.user.findFirst({
        where: {
          deletedAt: null,
          email: { equals: email, mode: 'insensitive' },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          organizationId: true,
          profile: { select: { role: true } },
          userRoles: { include: { role: { select: { name: true } } } },
          // Multi-program: pull all the user's enrollments (primary first) for
          // the inspect card. The card today only renders the legacy
          // `wapEnrollments` (CourseProgress rows), so this is informational -
          // a future PR will surface the full enrollment list.
          courseEnrollments: {
            select: {
              programSlug: true,
              isPrimary: true,
              enrolledAt: true,
              updatedAt: true,
            },
            orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
          },
        },
      }),
    );

    // CourseProgress + MemberProgramProgress: pulled per-user (these tables
    // inherit tenant via the User FK; once we have the userId it's safe).
    let wapEnrollments: InspectResponse['wap']['enrollments'] = [];
    let memberProgramProgressCount = 0;
    if (wapUser) {
      const [progressRows, memberProgressCount] = await Promise.all([
        prisma.$transaction((tx) => tx.courseProgress.findMany({
          where: { userId: wapUser.id },
          select: {
            courseId: true,
            courseSlug: true,
            programSlug: true,
            status: true,
            lastUpdatedAt: true,
          },
          orderBy: { lastUpdatedAt: 'desc' },
          take: 100,
        })),
        prisma.$transaction((tx) => tx.memberProgramProgress.count({ where: { userId: wapUser.id } })),
      ]);
      memberProgramProgressCount = memberProgressCount;
      wapEnrollments = progressRows.map((row) => ({
        courseId: row.courseId ?? row.courseSlug,
        programSlug: row.programSlug,
        status: String(row.status),
        lastActivityAt: row.lastUpdatedAt ? row.lastUpdatedAt.toISOString() : null,
      }));
    }

    const profileRole = wapUser?.profile?.role ?? null;
    const extraRoles = wapUser
      ? wapUser.userRoles.map((ur) => ur.role.name).filter(Boolean)
      : [];
    const isMember = (wapEnrollments.length > 0) || memberProgramProgressCount > 0;

    // ────────────── Identity mappings ──────────────
    // Only return identity mappings for users in the caller's organization.
    // If no WAP user exists in this org, local mapping/xAPI data is empty
    // (super-admins bypass and see all data).
    const isSuper = await isSuperAdmin(user.id);
    await ensureCourseraMappingTables();
    let mappingRows: IdentityMappingRow[] = [];
    if (wapUser || isSuper) {
      if (isSuper) {
        mappingRows = await prisma.$transaction((tx) => tx.$queryRaw<IdentityMappingRow[]>`
          SELECT
            id,
            coursera_email AS "courseraEmail",
            actor_identifier AS "actorIdentifier",
            source,
            notes,
            created_at AS "createdAt",
            last_seen_at AS "lastSeenAt"
          FROM coursera_identity_mappings
          WHERE LOWER(coursera_email) = ${email}
             OR (${wapUser?.id ?? null}::text IS NOT NULL AND user_id = ${wapUser?.id ?? null}::text)
          ORDER BY created_at DESC
          LIMIT 50
        `);
      } else {
        mappingRows = await prisma.$transaction((tx) => tx.$queryRaw<IdentityMappingRow[]>`
          SELECT
            id,
            coursera_email AS "courseraEmail",
            actor_identifier AS "actorIdentifier",
            source,
            notes,
            created_at AS "createdAt",
            last_seen_at AS "lastSeenAt"
          FROM coursera_identity_mappings
          WHERE user_id IN (SELECT id FROM users WHERE organization_id = ${orgId} AND deleted_at IS NULL)
            AND (
              LOWER(coursera_email) = ${email}
              OR (${wapUser?.id ?? null}::text IS NOT NULL AND user_id = ${wapUser?.id ?? null}::text)
            )
          ORDER BY created_at DESC
          LIMIT 50
        `);
      }
    }

    // ────────────── Coursera roster lookup ──────────────
    let rosterMatch: B4BUser | null = null;
    let rosterCapHit = false;
    let rosterError: string | null = null;
    try {
      const roster = await listAllUsers({ pageLimit: 1000, safetyCap: ROSTER_PAGE_CAP });
      rosterMatch = roster.elements.find((u) => normEmail(u.email) === email) ?? null;
      if (!rosterMatch && roster.pagesFetched >= ROSTER_PAGE_CAP) {
        // We exhausted the cap. Caller should be told this is a soft miss.
        rosterCapHit = roster.elements.length >= 1000 * ROSTER_PAGE_CAP;
      }
    } catch (err) {
      captureApiError(err, {
        route: 'admin/coursera/inspect-by-email',
        extra: { stage: 'roster' },
      });
      rosterError = err instanceof Error ? err.message : 'Coursera roster fetch failed';
    }

    // ────────────── Coursera enrollment + gradebook reports ──────────────
    let enrollmentReports: B4BEnrollmentReport[] = [];
    let gradebookReports: B4BGradebookReport[] = [];
    let courseraReportsError: string | null = null;
    try {
      // Enrollment reports: prefer byUserProgramId for the configured program;
      // also fall back to byProgramId so we can client-side-filter for any
      // additional programs the learner is in.
      const [byUser, byProgram, gradebook] = await Promise.allSettled([
        getEnrollmentReports({
          byUserProgramId: true,
          programId,
          externalId: email,
          limit: 200,
        }),
        getEnrollmentReports({ byProgramId: true, programId, limit: 1000 }),
        getCourseGradebookReports({ emailOrExternalId: email, limit: 200 }),
      ]);

      if (byUser.status === 'fulfilled') {
        enrollmentReports.push(...byUser.value.elements);
      }
      if (byProgram.status === 'fulfilled') {
        // Filter the program-wide pull down to this learner's email/externalId.
        const filtered = byProgram.value.elements.filter((r) => {
          const reportEmail = normEmail(r.email ?? r.externalId ?? '');
          return reportEmail === email || normEmail(r.externalId) === email;
        });
        // Avoid duplicating rows already returned by byUser.
        const seen = new Set(
          enrollmentReports.map((r) => `${r.programId}:${r.contentId}`),
        );
        for (const row of filtered) {
          const key = `${row.programId}:${row.contentId}`;
          if (!seen.has(key)) {
            enrollmentReports.push(row);
            seen.add(key);
          }
        }
      }

      if (gradebook.status === 'fulfilled') {
        gradebookReports = gradebook.value.elements;
      }

      // Surface any partial failure but don't fail the whole route.
      const failures = [byUser, byProgram, gradebook].filter(
        (r) => r.status === 'rejected',
      ) as PromiseRejectedResult[];
      if (failures.length === 3) {
        courseraReportsError = failures[0]?.reason instanceof Error
          ? failures[0].reason.message
          : 'Coursera reports fetch failed';
      }
    } catch (err) {
      captureApiError(err, {
        route: 'admin/coursera/inspect-by-email',
        extra: { stage: 'reports' },
      });
      courseraReportsError = err instanceof Error ? err.message : 'Coursera reports fetch failed';
    }

    // ────────────── xAPI activity ──────────────
    // Scope xAPI queries to the WAP user's organization. If no WAP user in
    // this org, only super-admins see xAPI data (empty for regular admins).
    let statementAgg = 0;
    let statementLatest: { createdAt: Date } | null = null;
    let unprocessedCount = 0;

    if (wapUser || isSuper) {
      const userIdFilter = wapUser?.id ?? null;
      const orgFilter = isSuper ? null : orgId;

      // Pre-compute org-scoped user IDs for xAPI queries
      let orgUserIds: string[] | undefined;
      if (orgFilter) {
        const orgUsers = await prisma.$transaction((tx) => tx.user.findMany({
          where: { organizationId: orgFilter, deletedAt: null },
          select: { id: true },
        }));
        orgUserIds = orgUsers.map((u) => u.id);
      }

      [statementAgg, statementLatest] = await Promise.all([
        prisma.$transaction((tx) => tx.xapiStatement.count({
          where: {
            actorEmail: { equals: email, mode: 'insensitive' },
            ...(orgUserIds ? { userId: { in: orgUserIds } } : {}),
          },
        })),
        prisma.$transaction((tx) => tx.xapiStatement.findFirst({
          where: {
            actorEmail: { equals: email, mode: 'insensitive' },
            ...(orgUserIds ? { userId: { in: orgUserIds } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })),
      ]);

      const unprocessedRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM coursera_xapi_events
        WHERE LOWER(actor_email) = ${email}
          AND completion_status IS DISTINCT FROM 'matched'
          ${orgFilter ? prisma.$queryRaw`AND user_id IN (SELECT id FROM users WHERE organization_id = ${orgFilter} AND deleted_at IS NULL)` : prisma.$queryRaw``}
      `;
      unprocessedCount = Number(unprocessedRows[0]?.count ?? 0);
    }

    // ────────────── Diagnosis narrative ──────────────
    const diagnosis: string[] = [];

    if (!wapUser) {
      diagnosis.push(
        `No WAP user exists for ${email} in this organization. They have never signed up here, or were deleted.`,
      );
    } else if (profileRole === 'super_admin') {
      diagnosis.push(
        `User is a super-admin (platform role); no member-side data is rendered on /dashboard. This is expected for staff.`,
      );
    } else if (profileRole === 'admin') {
      diagnosis.push(
        `User is an org admin; member-side data is not expected unless they are also enrolled in a program.`,
      );
    } else if (!isMember) {
      diagnosis.push(
        `User exists in WAP as role "${profileRole ?? 'member'}" but has no CourseEnrollment / MemberProgramProgress rows yet.`,
      );
    }

    if (rosterError) {
      diagnosis.push(`Coursera roster could not be fetched: ${rosterError}.`);
    } else if (rosterMatch) {
      const programs = Array.isArray(rosterMatch.membershipProgramIds)
        ? rosterMatch.membershipProgramIds
        : [];
      diagnosis.push(
        `Coursera knows this email (externalId=${rosterMatch.externalId ?? rosterMatch.id ?? '?'}; ${programs.length} program membership(s)).`,
      );
      if (wapUser && !isMember) {
        diagnosis.push(
          `User exists in Coursera roster but has no WAP CourseEnrollment rows. Their /dashboard/training will show 0% - they need a WAP enrollment (or this is intentional for staff).`,
        );
      }
      if (!wapUser) {
        diagnosis.push(
          `Coursera knows this learner but no WAP user exists. Click "Add to WorkforceAP" to provision the WAP account and bind the mapping.`,
        );
      }
    } else {
      if (rosterCapHit) {
        diagnosis.push(
          `Did not find ${email} within the first ${1000 * ROSTER_PAGE_CAP} Coursera roster entries. Increase the cap or query a smaller program scope.`,
        );
      } else {
        diagnosis.push(
          `Coursera roster does NOT include ${email}. They have not been added on the Coursera For Business side yet.`,
        );
      }
      if (mappingRows.length > 0) {
        diagnosis.push(
          `Identity mapping exists but Coursera roster does not include this email - the mapping is dead until the learner is added to Coursera.`,
        );
      }
    }

    if (enrollmentReports.length > 0) {
      const completed = enrollmentReports.filter((r) => r.isCompleted).length;
      const avg =
        enrollmentReports.reduce((sum, r) => sum + (r.overallProgress ?? 0), 0) /
        Math.max(enrollmentReports.length, 1);
      diagnosis.push(
        `Coursera shows ${enrollmentReports.length} enrollment report row(s); ${completed} completed; average progress ${Math.round(avg * 100)}%.`,
      );
    } else if (rosterMatch) {
      diagnosis.push(
        `Coursera roster has them but no enrollmentReports rows came back for program ${programId}. They may be in a different program or not yet started any course.`,
      );
    }

    if (statementAgg > 0) {
      diagnosis.push(
        `xAPI: ${statementAgg} statement(s) received locally; ${unprocessedCount} have not been matched.`,
      );
    }

    if (
      wapUser &&
      isMember &&
      rosterMatch &&
      enrollmentReports.length > 0 &&
      profileRole !== 'super_admin' &&
      profileRole !== 'admin'
    ) {
      diagnosis.push(
        `User is fully reconciled. Coursera + WAP + xAPI all agree.`,
      );
    }

    if (courseraReportsError) {
      diagnosis.push(`Coursera reports fetch had a failure: ${courseraReportsError}.`);
    }

    // ────────────── Response shape ──────────────
    const response: InspectResponse = {
      email,
      wap: {
        userId: wapUser?.id ?? null,
        fullName: wapUser?.fullName ?? null,
        organizationId: wapUser?.organizationId ?? null,
        profileRole,
        extraRoles,
        isMember,
        enrollments: wapEnrollments,
      },
      identityMappings: mappingRows.map((row) => ({
        id: row.id,
        courseraEmail: row.courseraEmail,
        actorIdentifier: row.actorIdentifier,
        source: row.source,
        notes: row.notes,
        createdAt: row.createdAt.toISOString(),
        lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
      })),
      coursera: {
        foundInRoster: Boolean(rosterMatch),
        rosterEntry: rosterMatch
          ? {
              externalId: rosterMatch.externalId ?? rosterMatch.id ?? '',
              fullName: rosterMatch.fullName ?? '',
              membershipProgramIds: Array.isArray(rosterMatch.membershipProgramIds)
                ? rosterMatch.membershipProgramIds
                : [],
            }
          : null,
        enrollmentReports: enrollmentReports.map((r) => ({
          programId: r.programId,
          contentId: r.contentId,
          contentType: r.contentType ?? '',
          isCompleted: Boolean(r.isCompleted),
          overallProgress:
            typeof r.overallProgress === 'number' ? r.overallProgress : null,
          lastActivityAt: epochToIso(r.lastActivity),
        })),
        gradebookReports: gradebookReports.map((r) => {
          // Coursera's gradebook payload has slightly different shapes per
          // tenant; pull both well-known keys with a permissive fallback.
          const raw = r as unknown as Record<string, unknown>;
          const courseId =
            (typeof raw.courseId === 'string' && raw.courseId) ||
            (typeof raw.contentId === 'string' && (raw.contentId as string)) ||
            '';
          const collectionName =
            (typeof raw.courseName === 'string' && (raw.courseName as string)) ||
            (typeof raw.contentName === 'string' && (raw.contentName as string)) ||
            '';
          const overall =
            typeof raw.overallProgress === 'number'
              ? (raw.overallProgress as number)
              : 0;
          const hours =
            typeof raw.totalLearningHours === 'number'
              ? (raw.totalLearningHours as number)
              : typeof raw.approxTotalLearningHrs === 'number'
                ? (raw.approxTotalLearningHrs as number)
                : 0;
          const lastActivity =
            typeof raw.lastActivity === 'number'
              ? epochToIso(raw.lastActivity as number)
              : null;
          return {
            programId: typeof r.programId === 'string' ? r.programId : '',
            courseId,
            collectionName,
            overallProgress: overall,
            approxTotalLearningHrs: hours,
            lastActivityAt: lastActivity,
          };
        }),
      },
      xapiActivity: {
        statementCount: statementAgg,
        latestStatementAt: statementLatest?.createdAt
          ? statementLatest.createdAt.toISOString()
          : null,
        unprocessedCount,
      },
      diagnosis,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('/admin/coursera/inspect-by-email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
