import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { loadLearnerProgressByExternalEmail } from '@/lib/coursera/progressQueries';

export const metadata: Metadata = buildPageMetadata({
  title: 'Coursera learner detail (unmatched)',
  description: 'Per-Coursera-email progress drill-down for learners not bound to a WAP user.',
  path: '/admin/coursera/learners/unmatched',
});

export const dynamic = 'force-dynamic';

function formatDateTime(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toLocaleString();
}

export default async function AdminCourseraUnmatchedLearnerPage({
  params,
}: {
  params: Promise<{ externalEmail: string }>;
}) {
  const viewer = await getUser();
  if (!viewer) redirect('/login?redirectTo=/admin/coursera');
  if (!(await isAdmin(viewer.id))) redirect('/dashboard');

  const { externalEmail } = await params;
  const decoded = decodeURIComponent(externalEmail);
  const detail = await loadLearnerProgressByExternalEmail(decoded);

  return (
    <PortalPageFrame>
      <PageHeader
        title={detail?.externalName || decoded}
        subtitle={`Coursera-only learner · ${decoded}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Coursera', href: '/admin/coursera' },
          { label: 'Unmatched' },
        ]}
      />

      {!detail ? (
        <section className="content-card" style={{ padding: '1rem 1.1rem' }}>
          <p style={{ margin: 0 }}>
            No CSV-imported Coursera progress found for <code>{decoded}</code>.{' '}
            <Link href="/admin/coursera">Back to Coursera admin →</Link>
          </p>
        </section>
      ) : (
        <>
          <section
            className="content-card"
            style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.4rem' }}
          >
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Identity</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
              This learner is not yet bound to a WAP user. Map them from the{' '}
              <Link href="/admin/coursera">Coursera admin page</Link> to backfill the binding.
            </p>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(8rem, max-content) 1fr',
                columnGap: '1rem',
                rowGap: '0.35rem',
                margin: '0.2rem 0 0',
                fontSize: '0.9rem',
              }}
            >
              <dt style={{ color: 'var(--color-on-surface-variant)' }}>Coursera name</dt>
              <dd style={{ margin: 0 }}>{detail.externalName ?? '—'}</dd>
              <dt style={{ color: 'var(--color-on-surface-variant)' }}>Coursera email</dt>
              <dd style={{ margin: 0 }}>{detail.externalEmail}</dd>
            </dl>
          </section>

          {detail.courses.length > 0 ? (
            <section
              className="content-card"
              style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.6rem' }}
            >
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera courses</h2>
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
                    {detail.courses.map((course) => (
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

          {detail.badges.length > 0 ? (
            <section
              className="content-card"
              style={{ padding: '1rem 1.1rem', marginBottom: '1rem', display: 'grid', gap: '0.6rem' }}
            >
              <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Specializations / badges</h2>
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
                    {detail.badges.map((badge) => (
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
        </>
      )}
    </PortalPageFrame>
  );
}
