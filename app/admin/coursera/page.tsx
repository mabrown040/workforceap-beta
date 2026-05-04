import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CourseraMappingsAdmin from '@/components/admin/CourseraMappingsAdmin';
import CourseraUnmatchedLearners from '@/components/admin/CourseraUnmatchedLearners';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { listCourseraIdentityMappings, listRecentUnmatchedXapiEvents } from '@/lib/xapi/mappings';
import { loadBadgeProgressSummary, loadUnmatchedLearners } from '@/lib/coursera/progressQueries';

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

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin – Coursera Identity Mapping',
  description: 'Map Coursera learners to WorkforceAP members and review unmatched xAPI events.',
  path: '/admin/coursera',
});

export const dynamic = 'force-dynamic';

export default async function AdminCourseraPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/coursera');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  // Include every active user who is a member — those with profile.role === 'member'
  // and those without a profile row (the role helper defaults to 'member' there).
  // Coursera mapping needs to surface real members even before they enroll, and must
  // not be narrowed to fixture/demo accounts.
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { profile: { is: null } },
        { profile: { role: 'member' } },
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
      courseEnrollment: { select: { workspaceEmail: true, workspaceEmailProvisioned: true } },
    },
    take: 500,
  });

  let mappings = await Promise.resolve([] as Awaited<ReturnType<typeof listCourseraIdentityMappings>>);
  let unmatchedEvents = await Promise.resolve([] as Awaited<ReturnType<typeof listRecentUnmatchedXapiEvents>>);
  let loadError: string | null = null;

  try {
    [mappings, unmatchedEvents] = await Promise.all([
      listCourseraIdentityMappings(),
      listRecentUnmatchedXapiEvents(100),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unable to load Coursera mapping data right now.';
    console.error('[admin/coursera] failed to load mapping data:', error);
  }

  const courseProgress = await loadCourseProgressSummary();
  const badgeProgress = await loadBadgeProgressSummary();
  const unmatchedLearners = await loadUnmatchedLearners(100);

  const memberOptions = members.map((member) => ({
    id: member.id,
    fullName: member.fullName,
    email: member.email,
    programTitle: member.enrolledProgram ? getProgramBySlug(member.enrolledProgram)?.title ?? member.enrolledProgram : null,
    workspaceEmail: member.courseEnrollment?.workspaceEmail ?? member.workspaceEmail,
    workspaceEmailProvisioned:
      member.courseEnrollment?.workspaceEmailProvisioned ?? member.workspaceEmailProvisioned,
  }));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Coursera identity mapping"
        subtitle="Manually bind Coursera learners to WAP members and review xAPI events that did not match automatically."
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Coursera' }]}
      />

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
        <div className="content-card" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <strong>Matching order</strong>
            <span style={{ color: 'var(--color-on-surface-variant)' }}>
              Manual actor mapping, then manual Coursera email mapping, then direct email match from xAPI Mbox.
            </span>
          </div>
        </div>

        {loadError ? (
          <div className="content-card" style={{ padding: '1rem 1.1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <strong>Coursera mapping data is temporarily unavailable</strong>
              <span style={{ color: 'var(--color-on-surface-variant)' }}>
                The admin page loaded, but the mapping tables or recent xAPI events could not be read yet.
              </span>
              <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
                Error: {loadError}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <section
        className="content-card"
        style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera course progress</h2>
            <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              Per-learner-per-course progress imported from the Coursera "Learner activity &amp; progress"
              CSV report. Use this for backfill and as a redundant feed alongside the realtime xAPI bridge.
            </span>
          </div>
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

        {courseProgress ? (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              <span><strong>{courseProgress.totalRows}</strong> course progress row(s)</span>
              <span>•</span>
              <span>Last synced: <strong>{fmtDateTime(courseProgress.latestSyncedAt)}</strong></span>
            </div>

            {courseProgress.topLearners.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Learner</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Course</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Progress</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Hours</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseProgress.topLearners.map((learner) => (
                      <tr key={learner.id}>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {learner.user ? (
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
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {learner.courseName}
                          {learner.isCompleted ? (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}>
                              completed
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                          {learner.overallProgress.toFixed(2)}%
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                          {learner.learningHours.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {fmtDateTime(learner.lastActivityTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      </section>

      <section
        className="content-card"
        style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.75rem' }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Specialization progress</h2>
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Learner</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Badge</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Progress</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Courses done</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Current course</th>
                      <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Last activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {badgeProgress.topLearners.map((learner) => (
                      <tr key={learner.id}>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {learner.user ? (
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
                          )}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {learner.badgeTitle}
                          {learner.badgeCompleted ? (
                            <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}>
                              completed
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                          {learner.progressPercent.toFixed(2)}%
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                          {learner.coursesCompleted}/{learner.numberOfCourses}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {learner.currentCourseName ?? '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                          {fmtDateTime(learner.lastActivityTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
      </section>

      <div style={{ marginBottom: '1rem' }}>
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

      <CourseraMappingsAdmin
        members={memberOptions}
        mappings={mappings}
        unmatchedEvents={unmatchedEvents}
      />
    </PortalPageFrame>
  );
}
