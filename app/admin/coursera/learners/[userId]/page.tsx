import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getProfileRole, isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import CourseraProgressCard from '@/components/portal/CourseraProgressCard';
import { loadLearnerProgressByUserId } from '@/lib/coursera/progressQueries';

export const metadata: Metadata = buildPageMetadata({
  title: 'Coursera learner detail',
  description: 'Per-learner Coursera course progress and identity mappings.',
  path: '/admin/coursera/learners',
});

export const dynamic = 'force-dynamic';

type IdentityMappingRow = {
  id: string;
  courseraEmail: string | null;
  actorIdentifier: string | null;
  actorHomePage: string | null;
  source: string;
  notes: string | null;
  lastSeenAt: Date | null;
  createdAt: Date;
};

async function loadIdentityMappingsForUser(userId: string): Promise<IdentityMappingRow[]> {
  // Raw query: the table is created on demand by lib/xapi/mappings.ts and is
  // not modeled in Prisma yet. We tolerate "table does not exist" errors so
  // the page still renders for users without xAPI activity.
  try {
    return await prisma.$queryRaw<IdentityMappingRow[]>`
      SELECT
        id,
        coursera_email AS "courseraEmail",
        actor_identifier AS "actorIdentifier",
        actor_home_page AS "actorHomePage",
        source,
        notes,
        last_seen_at AS "lastSeenAt",
        created_at AS "createdAt"
      FROM coursera_identity_mappings
      WHERE user_id = ${userId}::uuid
      ORDER BY updated_at DESC, created_at DESC
    `;
  } catch (err) {
    console.error('[admin/coursera/learners] failed to load identity mappings:', err);
    return [];
  }
}

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleString();
}

export default async function AdminCourseraLearnerPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const actor = await getUser();
  if (!actor) redirect(`/login?redirectTo=/admin/coursera/learners/${userId}`);
  if (!(await isAdmin(actor.id))) redirect('/dashboard');

  const member = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      workspaceEmail: true,
      workspaceEmailProvisioned: true,
    },
  });
  if (!member) notFound();

  const role = await getProfileRole(member.id);

  const identityMappings = await loadIdentityMappingsForUser(member.id);
  const csvProgress = await loadLearnerProgressByUserId(member.id);

  return (
    <PortalPageFrame>
      <PageHeader
        title={member.fullName || member.email}
        subtitle="Read-only Coursera detail for this learner."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Coursera', href: '/admin/coursera' },
          { label: member.fullName || member.email },
        ]}
      />

      <section
        className="content-card"
        style={{
          padding: '1rem 1.1rem',
          marginBottom: '1rem',
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Identity</h2>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(8rem, max-content) 1fr',
            columnGap: '1rem',
            rowGap: '0.35rem',
            margin: 0,
            fontSize: '0.9rem',
          }}
        >
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Name</dt>
          <dd style={{ margin: 0 }}>{member.fullName || '—'}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Email</dt>
          <dd style={{ margin: 0 }}>{member.email}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Role</dt>
          <dd style={{ margin: 0 }}>{role}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Enrolled program</dt>
          <dd style={{ margin: 0 }}>{member.enrolledProgram || '—'}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Workspace email</dt>
          <dd style={{ margin: 0 }}>
            {member.workspaceEmail
              ? `${member.workspaceEmail}${member.workspaceEmailProvisioned ? '' : ' (not yet provisioned)'}`
              : '—'}
          </dd>
        </dl>
      </section>

      <div style={{ marginBottom: '1rem' }}>
        <CourseraProgressCard userId={member.id} />
      </div>

      {csvProgress && csvProgress.courses.length > 0 ? (
        <section
          className="content-card"
          style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.6rem' }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera courses (from CSV)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Course</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Progress</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Hours</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Last activity</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Certificate</th>
                </tr>
              </thead>
              <tbody>
                {csvProgress.courses.map((course) => (
                  <tr key={course.id}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      <strong>{course.courseName}</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                        {course.university ?? course.programName ?? course.programSlug}
                      </div>
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                      {course.overallProgress.toFixed(2)}%
                      {course.isCompleted ? (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}>
                          done
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                      {course.learningHours.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {formatDateTime(course.lastActivityTime)}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {course.certificateUrl ? (
                        <a href={course.certificateUrl} target="_blank" rel="noreferrer">view ↗</a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {csvProgress && csvProgress.badges.length > 0 ? (
        <section
          className="content-card"
          style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.6rem' }}
        >
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Specializations / badges (from CSV)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Badge</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Progress</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>Courses done</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Current course</th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Last activity</th>
                </tr>
              </thead>
              <tbody>
                {csvProgress.badges.map((badge) => (
                  <tr key={badge.id}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      <strong>{badge.badgeTitle}</strong>
                      {badge.badgeCompleted ? (
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}>
                          completed
                        </span>
                      ) : null}
                      {badge.badgeLink ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                          <a href={badge.badgeLink} target="_blank" rel="noreferrer">badge link ↗</a>
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                      {badge.progressPercent.toFixed(2)}%
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)', textAlign: 'right' }}>
                      {badge.coursesCompleted}/{badge.numberOfCourses}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {badge.currentCourseName ?? '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {formatDateTime(badge.lastActivityTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section
        className="content-card"
        style={{ padding: '1rem 1.1rem', display: 'grid', gap: '0.6rem' }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera identity mappings</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
            How this learner's Coursera activity is bound to their WorkforceAP account. Edits live on the
            main Coursera admin page.
          </p>
        </div>
        {identityMappings.length === 0 ? (
          <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
            No identity mappings recorded for this learner.
          </span>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    Coursera email
                  </th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    Actor identifier
                  </th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    Source
                  </th>
                  <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    Last seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {identityMappings.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {row.courseraEmail || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {row.actorIdentifier ? (
                        <span style={{ wordBreak: 'break-all' }}>
                          {row.actorIdentifier}
                          {row.actorHomePage ? (
                            <span style={{ color: 'var(--color-on-surface-variant)' }}>
                              {' '}
                              @ {row.actorHomePage}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {row.source}
                    </td>
                    <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                      {formatDateTime(row.lastSeenAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalPageFrame>
  );
}
