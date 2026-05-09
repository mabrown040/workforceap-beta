import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CourseraMappingsAdmin from '@/components/admin/CourseraMappingsAdmin';
import CourseraUnmatchedLearners from '@/components/admin/CourseraUnmatchedLearners';
import CourseraPipelineFlow from '@/components/admin/CourseraPipelineFlow';
import CourseraSyncProgressButton from '@/components/admin/CourseraSyncProgressButton';
import CourseraSelfTest from '@/components/admin/CourseraSelfTest';
import CourseraReconcileCard from '@/components/admin/CourseraReconcileCard';
import CourseraInspectByEmailCard from '@/components/admin/CourseraInspectByEmailCard';
import DataTable from '@/components/portal/ui/DataTable';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getDiscoveredProgram, getProgramBySlug } from '@/lib/content/programs';
import {
  getCourseraSyncStatus,
  listXapiStatementsNeedingAttention,
  loadMemberProgressAuditByEmail,
} from '@/lib/admin/courseraOps';
import {
  getCourseraSkillsetProgressSummary,
  listCourseraIdentityMappings,
  listRecentUnmatchedXapiEvents,
} from '@/lib/xapi/mappings';
import {
  countHiddenTestAccountUnmatchedLearners,
  loadBadgeProgressSummary,
  loadUnmatchedLearners,
} from '@/lib/coursera/progressQueries';

type CourseProgressSummary = {
  totalRows: number;
  latestSyncedAt: Date | null;
  topLearners: Array<{
    id: string;
    externalEmail: string;
    externalName: string | null;
    courseName: string;
    courseraCourseId: string;
    overallProgress: number;
    learningHours: number;
    isCompleted: boolean;
    lastActivityTime: Date | null;
    user: { fullName: string; email: string } | null;
  }>;
};

type XapiCourseProgressSummary = {
  totalRows: number;
  latestUpdatedAt: Date | null;
  topLearners: Array<{
    id: string;
    userId: string;
    fullName: string;
    email: string;
    programSlug: string;
    courseSlug: string;
    courseId: string | null;
    status: string;
    percentComplete: number;
    lastUpdatedAt: Date;
    lastActivityAt: Date | null;
  }>;
  courseLogRows: Array<{
    key: string;
    userId: string;
    fullName: string;
    email: string;
    programSlug: string;
    programTitle: string;
    courseSlug: string;
    courseName: string;
    courseId: string | null;
    status: string;
    percentComplete: number;
    lastUpdatedAt: Date | null;
    lastActivityAt: Date | null;
  }>;
};

type XapiCourseLogMember = {
  id: string;
  fullName: string;
  email: string;
  enrolledProgram: string | null;
};

async function loadXapiCourseProgressSummary(
  members: XapiCourseLogMember[]
): Promise<XapiCourseProgressSummary | null> {
  try {
    const summaryRows = await prisma.$queryRaw<Array<{ total: bigint; latest: Date | null }>>`
      SELECT COUNT(*)::bigint AS total, MAX(last_updated_at) AS latest FROM course_progress
    `;
    const top = await prisma.$queryRaw<
      Array<{
        id: string;
        userId: string;
        fullName: string;
        email: string;
        programSlug: string;
        courseSlug: string;
        courseId: string | null;
        status: string;
        percentComplete: number;
        lastUpdatedAt: Date;
        lastActivityAt: Date | null;
      }>
    >`
      SELECT
        cp.id,
        cp.user_id AS "userId",
        u.full_name AS "fullName",
        u.email,
        cp.program_slug AS "programSlug",
        cp.course_slug AS "courseSlug",
        cp.course_id AS "courseId",
        cp.status::text AS "status",
        cp.percent_complete AS "percentComplete",
        cp.last_updated_at AS "lastUpdatedAt",
        cp.last_activity_at AS "lastActivityAt"
      FROM course_progress cp
      JOIN users u ON u.id = cp.user_id
      ORDER BY cp.last_updated_at DESC
      LIMIT 10
    `;

    const membersWithProgress = members.filter((member) => member.enrolledProgram);
    const progressRows = await prisma.courseProgress.findMany({
      where: {
        userId: { in: membersWithProgress.map((member) => member.id) },
      },
      select: {
        userId: true,
        programSlug: true,
        courseSlug: true,
        courseId: true,
        status: true,
        percentComplete: true,
        lastUpdatedAt: true,
        lastActivityAt: true,
      },
    });
    const progressMap = new Map(
      progressRows.map((row) => [`${row.userId}:${row.programSlug}:${row.courseSlug}`, row])
    );

    const courseLogRows = membersWithProgress.flatMap((member) => {
      const programSlug = member.enrolledProgram;
      if (!programSlug) return [];
      const program = getProgramBySlug(programSlug);
      if (!program) return [];
      const discovered = getDiscoveredProgram(programSlug);
      const discoveredBySlug = new Map((discovered?.courses ?? []).map((course) => [course.slug, course]));

      return program.courses.map((course) => {
        const progress = progressMap.get(`${member.id}:${programSlug}:${course.slug}`);
        const discoveredCourse = discoveredBySlug.get(course.slug);
        return {
          key: `${member.id}:${programSlug}:${course.slug}`,
          userId: member.id,
          fullName: member.fullName,
          email: member.email,
          programSlug,
          programTitle: program.title,
          courseSlug: course.slug,
          courseName: course.name,
          courseId: progress?.courseId ?? discoveredCourse?.courseId ?? course.courseraCourseId ?? null,
          status: progress?.status ?? 'NOT_STARTED',
          percentComplete: progress?.percentComplete ?? 0,
          lastUpdatedAt: progress?.lastUpdatedAt ?? null,
          lastActivityAt: progress?.lastActivityAt ?? null,
        };
      });
    });

    return {
      totalRows: Number(summaryRows[0]?.total ?? 0),
      latestUpdatedAt: summaryRows[0]?.latest ?? null,
      topLearners: top.map((row) => ({
        id: row.id,
        userId: row.userId,
        fullName: row.fullName,
        email: row.email,
        programSlug: row.programSlug,
        courseSlug: row.courseSlug,
        courseId: row.courseId,
        status: row.status,
        percentComplete: row.percentComplete,
        lastUpdatedAt: row.lastUpdatedAt,
        lastActivityAt: row.lastActivityAt,
      })),
      courseLogRows,
    };
  } catch (error) {
    console.error('[admin/coursera] failed to load xAPI course progress summary:', error);
    return null;
  }
}

async function loadCourseProgressSummary(): Promise<CourseProgressSummary | null> {
  try {
    const summaryRows = await prisma.$queryRaw<Array<{ total: bigint | number; latest: Date | null }>>`
      SELECT COUNT(*)::bigint AS total, MAX(last_synced_at) AS latest FROM coursera_course_progress
    `;
    const top = await prisma.$queryRaw<Array<{
      id: string;
      externalEmail: string;
      externalName: string | null;
      courseName: string;
      courseraCourseId: string;
      overallProgress: string | number;
      learningHours: string | number;
      isCompleted: boolean;
      lastActivityTime: Date | null;
      userFullName: string | null;
      userEmail: string | null;
    }>>`
      SELECT
        ccp.id,
        ccp.external_email AS "externalEmail",
        ccp.external_name AS "externalName",
        ccp.course_name AS "courseName",
        ccp.coursera_course_id AS "courseraCourseId",
        ccp.overall_progress AS "overallProgress",
        ccp.learning_hours AS "learningHours",
        ccp.is_completed AS "isCompleted",
        ccp.last_activity_time AS "lastActivityTime",
        u.full_name AS "userFullName",
        u.email AS "userEmail"
      FROM coursera_course_progress ccp
      LEFT JOIN users u ON u.id = ccp.user_id
      ORDER BY ccp.overall_progress DESC, ccp.last_activity_time DESC NULLS LAST
      LIMIT 10
    `;

    return {
      totalRows: Number(summaryRows[0]?.total ?? 0),
      latestSyncedAt: summaryRows[0]?.latest ?? null,
      topLearners: top.map((row) => ({
        id: row.id,
        externalEmail: row.externalEmail,
        externalName: row.externalName,
        courseName: row.courseName,
        courseraCourseId: row.courseraCourseId,
        overallProgress: Number(row.overallProgress) || 0,
        learningHours: Number(row.learningHours) || 0,
        isCompleted: row.isCompleted,
        lastActivityTime: row.lastActivityTime,
        user: row.userFullName && row.userEmail
          ? { fullName: row.userFullName, email: row.userEmail }
          : null,
      })),
    };
  } catch (error) {
    console.error('[admin/coursera] failed to load CSV progress summary:', error);
    return null;
  }
}

function fmtDateTime(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleString();
}

// Shared styles for collapsible section headers on this page. Each section
// is wrapped in a <details> with a <summary> bar so the page is short and
// scannable by default. Sections can be expanded individually.
const collapsibleSectionStyle: CSSProperties = {
  padding: 0,
  marginBottom: '1rem',
};
const collapsibleSummaryStyle: CSSProperties = {
  cursor: 'pointer',
  userSelect: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  padding: '0.85rem 1.1rem',
  fontSize: '1.05rem',
  fontWeight: 600,
};
const collapsibleBodyStyle: CSSProperties = {
  display: 'grid',
  gap: '0.75rem',
  padding: '0.85rem 1.1rem 1rem',
  borderTop: '1px solid var(--outline-variant)',
};
const collapsibleCountStyle: CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 400,
  color: 'var(--color-on-surface-variant)',
};

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Admin – Coursera Identity Mapping',
    description: 'Map Coursera learners to WorkforceAP members, audit xAPI statements, and review member course progress.',
    path: '/admin/coursera',
  });
}

export const dynamic = 'force-dynamic';

export default async function AdminCourseraPage({
  searchParams,
}: {
  searchParams?: Promise<{ auditEmail?: string; showTest?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/coursera');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const sp = (await searchParams) ?? {};
  const auditEmailRaw = typeof sp.auditEmail === 'string' ? sp.auditEmail : '';
  const showTestAccounts = sp.showTest === '1' || sp.showTest === 'true';

  // Include members, profile-less rows (treated as member), and admin/super_admin
  // dogfood accounts (same idea as MEMBER_OR_DOGFOOD_WHERE) so Coursera tooling
  // stays usable for platform operators testing with their own learner email.
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { profile: { is: null } },
        { profile: { role: 'member' } },
        { profile: { role: { in: ['admin', 'super_admin'] } } },
      ],
    },
    orderBy: [{ fullName: 'asc' }],
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
      // Multi-program: workspace email is on the primary enrollment.
      courseEnrollments: {
        where: { isPrimary: true },
        select: { workspaceEmail: true, workspaceEmailProvisioned: true },
        take: 1,
      },
    },
    take: 500,
  });

  let mappings = await Promise.resolve([] as Awaited<ReturnType<typeof listCourseraIdentityMappings>>);
  let xapiAttention = await Promise.resolve([] as Awaited<ReturnType<typeof listXapiStatementsNeedingAttention>>);
  let syncStatus = await Promise.resolve({
    lastXapiReceivedAt: null as Date | null,
    distinctMembersWithCourseProgress: 0,
    attentionStatementCount: 0,
  });
  let progressAudit = await Promise.resolve(
    null as Awaited<ReturnType<typeof loadMemberProgressAuditByEmail>> | null
  );
  let loadError: string | null = null;
  let progressAuditError: string | null = null;

  try {
    [mappings, xapiAttention, syncStatus] = await Promise.all([
      listCourseraIdentityMappings(),
      listXapiStatementsNeedingAttention(100),
      getCourseraSyncStatus(),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unable to load Coursera mapping data right now.';
    console.error('[admin/coursera] failed to load mapping data:', error);
  }

  const courseProgress = await loadCourseProgressSummary();
  const xapiCourseProgress = await loadXapiCourseProgressSummary(members);
  const badgeProgress = await loadBadgeProgressSummary();
  const unmatchedLearners = await loadUnmatchedLearners(100, {
    includeTestAccounts: showTestAccounts,
  });
  const hiddenTestAccountCount = showTestAccounts
    ? 0
    : await countHiddenTestAccountUnmatchedLearners();
  const skillsetProgress = await getCourseraSkillsetProgressSummary(10);

  if (auditEmailRaw.trim().length > 0) {
    try {
      progressAudit = await loadMemberProgressAuditByEmail(auditEmailRaw);
    } catch (error) {
      progressAuditError = error instanceof Error ? error.message : 'Unable to load progress audit.';
      console.error('[admin/coursera] progress audit failed:', error);
    }
  }

  const memberOptions = members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    programTitle: member.enrolledProgram ? getProgramBySlug(member.enrolledProgram)?.title ?? member.enrolledProgram : null,
    workspaceEmail: member.courseEnrollments[0]?.workspaceEmail ?? member.workspaceEmail,
    workspaceEmailProvisioned:
      member.courseEnrollments[0]?.workspaceEmailProvisioned ?? member.workspaceEmailProvisioned,
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Coursera identity mapping"
        subtitle="Manually bind Coursera learners to WAP members, audit xAPI statements, and inspect member course progress."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Coursera' }]}
      />

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        <div className="content-card coursera-admin-intro" style={{ padding: '1.25rem 1.35rem' }}>
          <h2 className="coursera-admin-intro__title">Where Coursera data lands</h2>
          <p className="coursera-admin-intro__copy">
            Coursera learning activity arrives as <strong>xAPI statements</strong>, is stored as <strong>XapiStatement</strong> rows,
            matched to a member (manual mapping or inbox email), then merged into <strong>CourseProgress</strong> for each course.
            That row-level progress is what members see on <strong>My Training</strong> and feeds completion signals elsewhere in the portal.
          </p>
          <CourseraPipelineFlow variant="full" />
          <p className="coursera-admin-intro__match">
            <strong>Matching order:</strong> manual actor / Coursera email mapping first, then direct email match from the xAPI actor
            mbox when no manual row applies.
          </p>
        </div>

        {loadError ? (
          <div className="content-card" style={{ padding: '1rem 1.1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <strong>Coursera mapping data is temporarily unavailable</strong>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>
                The admin page loaded, but the mapping tables or xAPI statement data could not be read yet.
              </span>
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                Error: {loadError}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Coursera course progress (CSV)
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {courseProgress
                ? `${courseProgress.totalRows} row(s) · last sync ${fmtDateTime(courseProgress.latestSyncedAt)}`
                : 'unavailable'}
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              Per-learner-per-course progress imported from the Coursera "Learner activity &amp; progress"
              CSV report. Use this for backfill and as a redundant feed alongside the realtime xAPI bridge.
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <CourseraSyncProgressButton />
            <Link
              href="/admin/coursera/csv-import"
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Import CSV →
            </Link>
          </div>
        </div>

        {courseProgress ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              <span><strong>{courseProgress.totalRows}</strong> course progress row(s)</span>
              <span>•</span>
              <span>Last synced: <strong>{fmtDateTime(courseProgress.latestSyncedAt)}</strong></span>
            </div>

            {courseProgress.topLearners.length > 0 ? (
              <DataTable
                density="compact"
                rows={courseProgress.topLearners}
                rowKey={(learner) => learner.id}
                columns={[
                  {
                    key: 'learner',
                    header: 'Learner',
                    cell: (learner) =>
                      learner.user ? (
                        <>
                          <strong>{learner.user.fullName}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{learner.user.email}</div>
                        </>
                      ) : (
                        <>
                          <strong>{learner.externalName || learner.externalEmail}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                            {learner.externalEmail} · unmapped
                          </div>
                        </>
                      ),
                  },
                  {
                    key: 'course',
                    header: 'Course',
                    cell: (learner) => (
                      <>
                        {learner.courseName}
                        {learner.isCompleted ? (
                          <span
                            style={{
                              marginLeft: '0.4rem',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '0.4rem',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: 'rgb(22, 163, 74)',
                            }}
                          >
                            completed
                          </span>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    key: 'progress',
                    header: 'Progress',
                    align: 'right',
                    cell: (learner) => `${learner.overallProgress.toFixed(2)}%`,
                  },
                  {
                    key: 'hours',
                    header: 'Hours',
                    align: 'right',
                    cell: (learner) => learner.learningHours.toFixed(2),
                  },
                  {
                    key: 'last',
                    header: 'Last activity',
                    cell: (learner) => fmtDateTime(learner.lastActivityTime),
                  },
                ]}
              />
            ) : (
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                No course progress imported yet. Use “Import CSV” to upload the latest Coursera export.
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            Course progress data is unavailable right now.
          </span>
        )}
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Live xAPI course progress
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {xapiCourseProgress
                ? `${xapiCourseProgress.totalRows} row(s) · last update ${fmtDateTime(xapiCourseProgress.latestUpdatedAt)}`
                : 'unavailable'}
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              Real-time course progress from xAPI statements (Coursera webhook). This is what members see on My Training.
            </span>
          </div>
        </div>

        {xapiCourseProgress ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              <span><strong>{xapiCourseProgress.totalRows}</strong> xAPI progress row(s)</span>
              <span>•</span>
              <span>Last updated: <strong>{fmtDateTime(xapiCourseProgress.latestUpdatedAt)}</strong></span>
            </div>

            {xapiCourseProgress.courseLogRows.length > 0 ? (
              <DataTable
                density="compact"
                rows={xapiCourseProgress.courseLogRows}
                rowKey={(row) => row.key}
                columns={[
                  {
                    key: 'learner',
                    header: 'Learner',
                    cell: (row) => (
                      <>
                        <strong>{row.fullName}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.email}</div>
                      </>
                    ),
                  },
                  { key: 'program', header: 'Program', cell: (row) => row.programTitle },
                  {
                    key: 'course',
                    header: 'Course',
                    cell: (row) => (
                      <>
                        {row.courseName}
                        {row.courseId ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{row.courseId}</div>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    key: 'pct',
                    header: 'Progress',
                    align: 'right',
                    cell: (row) => `${row.percentComplete}%`,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    cell: (row) =>
                      row.status === 'COMPLETED' ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '0.4rem',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: 'rgb(22, 163, 74)',
                          }}
                        >
                          completed
                        </span>
                      ) : row.status === 'IN_PROGRESS' ? (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '0.4rem',
                            background: 'rgba(164, 127, 56, 0.14)',
                            color: 'var(--color-accent)',
                          }}
                        >
                          in progress
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>not started</span>
                      ),
                  },
                  {
                    key: 'updated',
                    header: 'Last updated',
                    cell: (row) => fmtDateTime(row.lastUpdatedAt),
                  },
                  {
                    key: 'activity',
                    header: 'Last activity',
                    cell: (row) => row.lastActivityAt ? fmtDateTime(row.lastActivityAt) : '—',
                  },
                ]}
              />
            ) : (
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                No enrolled member course log is available yet. Progress appears here when members enroll in Coursera-backed programs.
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            xAPI progress data is unavailable right now.
          </span>
        )}
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Integration self-test
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              diagnose inbound xAPI + outbound B4B REST
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
          <CourseraSelfTest />
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle} open>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Inspect by email
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              unified per-email report across WAP + Coursera + xAPI with a diagnosis line
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
          <CourseraInspectByEmailCard />
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Reconcile with Coursera
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              diff Coursera roster vs WorkforceAP and add missing learners
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
          <CourseraReconcileCard />
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Specialization progress
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {badgeProgress
                ? `${badgeProgress.totalRows} row(s) · last sync ${fmtDateTime(badgeProgress.latestSyncedAt)}`
                : 'unavailable'}
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
        <div>
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            Per-learner-per-badge progress imported from the Coursera{' '}
            <em>LearningPathActivity</em> CSV. One record per (learner, badge), with badge
            progress percentage, courses completed, and the current in-progress course.
          </span>
        </div>

        {badgeProgress ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              <span><strong>{badgeProgress.totalRows}</strong> badge progress row(s)</span>
              <span>•</span>
              <span>Last synced: <strong>{fmtDateTime(badgeProgress.latestSyncedAt)}</strong></span>
            </div>

            {badgeProgress.topLearners.length > 0 ? (
              <DataTable
                density="compact"
                rows={badgeProgress.topLearners}
                rowKey={(learner) => learner.id}
                columns={[
                  {
                    key: 'learner',
                    header: 'Learner',
                    cell: (learner) =>
                      learner.user ? (
                        <>
                          <strong>{learner.user.fullName}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{learner.user.email}</div>
                        </>
                      ) : (
                        <>
                          <strong>{learner.externalName || learner.externalEmail}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                            {learner.externalEmail} · unmapped
                          </div>
                        </>
                      ),
                  },
                  {
                    key: 'badge',
                    header: 'Badge',
                    cell: (learner) => (
                      <>
                        {learner.badgeTitle}
                        {learner.badgeCompleted ? (
                          <span
                            style={{
                              marginLeft: '0.4rem',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.35rem',
                              borderRadius: '0.4rem',
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: 'rgb(22, 163, 74)',
                            }}
                          >
                            completed
                          </span>
                        ) : null}
                      </>
                    ),
                  },
                  {
                    key: 'progress',
                    header: 'Progress',
                    align: 'right',
                    cell: (learner) => `${learner.progressPercent.toFixed(2)}%`,
                  },
                  {
                    key: 'courses',
                    header: 'Courses done',
                    align: 'right',
                    cell: (learner) => `${learner.coursesCompleted}/${learner.numberOfCourses}`,
                  },
                  {
                    key: 'current',
                    header: 'Current course',
                    cell: (learner) => learner.currentCourseName ?? '—',
                  },
                  {
                    key: 'last',
                    header: 'Last activity',
                    cell: (learner) => fmtDateTime(learner.lastActivityTime),
                  },
                ]}
              />
            ) : (
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                No badge progress imported yet. Use “Import CSV” above and upload the
                <code> LearningPathActivity ... .csv</code> file from a Coursera enterprise export.
              </span>
            )}
          </>
        ) : (
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            Badge progress data is unavailable right now.
          </span>
        )}
        </div>
      </details>

      <details
        className="content-card"
        style={collapsibleSectionStyle}
        open={unmatchedLearners.length > 0 || showTestAccounts || hiddenTestAccountCount > 0}
      >
        <summary style={collapsibleSummaryStyle}>
          <span>
            Unmatched learners
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {unmatchedLearners.length} shown
              {hiddenTestAccountCount > 0 ? ` · ${hiddenTestAccountCount} hidden test` : ''}
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
        {hiddenTestAccountCount > 0 ? (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              marginBottom: '0.6rem',
              background: 'var(--surface-container-low, rgba(148, 163, 184, 0.08))',
              border: '1px dashed var(--outline-variant)',
              borderRadius: 8,
              fontSize: '0.85rem',
              color: 'var(--color-on-surface-variant)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span>
              Hiding <strong>{hiddenTestAccountCount}</strong> likely test/smoke account
              {hiddenTestAccountCount === 1 ? '' : 's'} from the unmatched list (matches:
              <code style={{ marginLeft: '0.25rem' }}>test*</code>,{' '}
              <code>force-*</code>, <code>noreply*</code>, <code>@example.com</code>).
            </span>
            <Link href="?showTest=1" style={{ fontWeight: 600 }}>
              Show all →
            </Link>
          </div>
        ) : showTestAccounts ? (
          <div
            style={{
              padding: '0.65rem 0.9rem',
              marginBottom: '0.6rem',
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px dashed rgba(251, 191, 36, 0.4)',
              borderRadius: 8,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'rgb(146, 90, 0)' }}>
              <strong>Showing all rows including test accounts.</strong> The list normally hides
              <code style={{ marginLeft: '0.25rem' }}>test*</code>, <code>force-*</code>,{' '}
              <code>noreply*</code>, and <code>@example.com</code> traffic.
            </span>
            <Link href="?" style={{ fontWeight: 600 }}>
              Hide test accounts →
            </Link>
          </div>
        ) : null}
        <CourseraUnmatchedLearners
          learners={unmatchedLearners}
          members={memberOptions.map((m) => ({
            id: m.id,
            fullName: m.fullName,
            email: m.email,
            programTitle: m.programTitle,
          }))}
        />
        </div>
      </details>

      <details className="content-card" style={collapsibleSectionStyle}>
        <summary style={collapsibleSummaryStyle}>
          <span>
            Active-pull skillset progress
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {skillsetProgress.totalRows} row(s)
              {skillsetProgress.latestSyncedAt
                ? ` · last sync ${skillsetProgress.latestSyncedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`
                : ''}
            </span>
          </span>
        </summary>
        <div style={collapsibleBodyStyle}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            Snapshot written by the <code>/api/cron/coursera-sync</code> cron
            (every 6h). Empty until skillset IDs are configured for at least one
            program.
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '0.25rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                Rows
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 600 }}>
                {skillsetProgress.totalRows}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                Last sync
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                {skillsetProgress.latestSyncedAt
                  ? skillsetProgress.latestSyncedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
                  : '—'}
              </div>
            </div>
          </div>

          {skillsetProgress.topMembers.length > 0 ? (
            <div style={{ marginTop: '0.5rem', overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
              <DataTable
                density="compact"
                scrollX={false}
                rows={skillsetProgress.topMembers}
                rowKey={(row) => `${row.userId}:${row.skillsetId}`}
                columns={[
                  {
                    key: 'member',
                    header: <span style={{ color: 'var(--color-on-surface-variant)' }}>Member</span>,
                    cell: (row) => (
                      <>
                        <div style={{ fontWeight: 500 }}>{row.userFullName || row.userEmail}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.userEmail}</div>
                      </>
                    ),
                  },
                  {
                    key: 'skillset',
                    header: <span style={{ color: 'var(--color-on-surface-variant)' }}>Skillset</span>,
                    cell: (row) => row.skillsetName,
                  },
                  {
                    key: 'pct',
                    header: <span style={{ color: 'var(--color-on-surface-variant)' }}>Progress</span>,
                    align: 'right',
                    cell: (row) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{row.progressPct}%</span>,
                  },
                  {
                    key: 'sync',
                    header: <span style={{ color: 'var(--color-on-surface-variant)' }}>Last sync</span>,
                    cell: (row) => (
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                        {row.lastSyncedAt.toISOString().slice(0, 10)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}
        </div>
        </div>
      </details>

      <details
        className="content-card"
        style={collapsibleSectionStyle}
        open={Boolean(auditEmailRaw.trim()) || Boolean(progressAuditError) || (xapiAttention?.length ?? 0) > 0}
      >
        <summary style={collapsibleSummaryStyle}>
          <span>
            Identity mapping &amp; audit tools
            <span style={{ ...collapsibleCountStyle, marginLeft: '0.5rem' }}>
              {mappings.length} mapping(s) · {xapiAttention.length} statement(s) need attention
            </span>
          </span>
        </summary>
        <div style={{ ...collapsibleBodyStyle, gap: 0 }}>
          <CourseraMappingsAdmin
            members={memberOptions}
            mappings={mappings}
            xapiAttention={xapiAttention}
            syncStatus={syncStatus}
            progressAudit={progressAudit}
            progressAuditError={progressAuditError}
            auditEmailInitial={auditEmailRaw}
          />
        </div>
      </details>
    </PortalPageFrame>
  );
}
