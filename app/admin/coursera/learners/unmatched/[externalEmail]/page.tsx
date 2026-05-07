import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { buildPageMetadata } from '@/app/seo';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import DataTable from '@/components/portal/ui/DataTable';
import SectionHeader from '@/components/portal/ui/SectionHeader';
import MapToUserActions from '@/components/admin/coursera/MapToUserActions';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import {
  loadLearnerProgressByExternalEmail,
  loadUnmatchedXapiEventsByExternalEmail,
  suggestUserMatchesForExternalEmail,
  type UnmatchedXapiEventRow,
} from '@/lib/coursera/progressQueries';

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

function shortVerb(verbId: string | null): string {
  if (!verbId) return '—';
  const tail = verbId.split('/').pop() ?? verbId;
  return tail;
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

  // Run all three loaders in parallel — if CSV is empty, xAPI is the entire
  // story; if both are present, we render both side-by-side. Suggestions are
  // computed against the WAP users table independently.
  const [csvDetail, xapiEvents, suggestions] = await Promise.all([
    loadLearnerProgressByExternalEmail(decoded),
    loadUnmatchedXapiEventsByExternalEmail(decoded, 100),
    suggestUserMatchesForExternalEmail(decoded, null, 5),
  ]);

  // Classify the key from actual data, NOT from the string shape.
  // - CSV always uses external_email, so a CSV hit means email-keyed.
  // - For xAPI events, check whether the matched rows have actor_email set.
  // Account-name actor_identifiers can contain '@' (e.g. an OpenID-style
  // identifier), so a substring check would misclassify them.
  const lowerDecoded = decoded.toLowerCase();
  const csvHit = csvDetail !== null;
  const xapiEmailHit = xapiEvents.some(
    (e) => (e.actorEmail ?? '').toLowerCase() === lowerDecoded,
  );
  const xapiActorHit = xapiEvents.some(
    (e) =>
      e.actorEmail === null && (e.actorIdentifier ?? '').toLowerCase() === lowerDecoded,
  );
  const keyType: 'email' | 'actor_identifier' =
    csvHit || xapiEmailHit ? 'email' : xapiActorHit ? 'actor_identifier' : 'email';
  const isEmailKey = keyType === 'email';

  // The Coursera display name might come from the CSV or be inferred later.
  const externalName = csvDetail?.externalName ?? null;

  // The most-recent xAPI event's actor_home_page. The resolver matches actor
  // mappings on `(actor_identifier, COALESCE(actor_home_page, ''))`, so we
  // pass this to the map button so an actor-only mapping carries the home
  // page and resolves on replay.
  const recentActorHomePage = xapiEvents.find((e) => e.actorHomePage)?.actorHomePage ?? null;

  // The case-preserved `actor_identifier` from the loaded xAPI rows.
  // `getMappingByActor` resolves with case-sensitive `cim.actor_identifier
  // = ?`, while the list URL key is lowercased via
  // `LOWER(COALESCE(actor_email, actor_identifier))`. Posting the URL key
  // as the mapping's actor_identifier would create a lowercase row that
  // never matches a mixed-case Coursera actor on replay. Use the original
  // value from the row.
  const recentActorIdentifier =
    xapiEvents.find((e) => e.actorIdentifier && e.actorEmail === null)?.actorIdentifier ?? null;

  // Re-run suggestions with the name once we have it (cheap; same query plan).
  const suggestionsWithName = externalName
    ? await suggestUserMatchesForExternalEmail(decoded, externalName, 5)
    : suggestions;

  const hasAnyData =
    csvDetail !== null || xapiEvents.length > 0;

  return (
    <PortalPageFrame>
      <PageHeader
        title={externalName || decoded}
        subtitle={`Coursera-only learner · ${decoded}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Coursera', href: '/admin/coursera' },
          { label: 'Unmatched' },
        ]}
      />

      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Identity / mapping action — always visible so admin can act. */}
        <section className="content-card" style={{ padding: '1rem 1.1rem', display: 'grid', gap: '0.75rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Map this learner to a WAP user</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
            This learner is not yet bound to a WAP user. Mapping them creates a row in
            <code> coursera_identity_mappings</code>, then re-processes any unmatched xAPI events
            for this Coursera email so existing activity flows back into the member&rsquo;s training
            progress.
          </p>
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
            <dt style={{ color: 'var(--color-on-surface-variant)' }}>Coursera name</dt>
            <dd style={{ margin: 0 }}>{externalName ?? '— (not in CSV)'}</dd>
            <dt style={{ color: 'var(--color-on-surface-variant)' }}>
              {isEmailKey ? 'Coursera email' : 'Coursera actor identifier'}
            </dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>
              <code style={{ fontSize: '0.85rem' }}>{decoded}</code>
            </dd>
            <dt style={{ color: 'var(--color-on-surface-variant)' }}>Unmatched xAPI events</dt>
            <dd style={{ margin: 0 }}>
              <strong>{xapiEvents.length}</strong>
              {xapiEvents.length === 0 ? ' — no live activity recorded for this email' : ''}
            </dd>
          </dl>
          <MapToUserActions
            externalEmail={decoded}
            externalName={externalName}
            keyType={keyType}
            actorIdentifier={recentActorIdentifier}
            actorHomePage={recentActorHomePage}
            suggestions={suggestionsWithName}
          />
        </section>

        {!hasAnyData ? (
          <section className="content-card" style={{ padding: '1rem 1.1rem' }}>
            <p style={{ margin: 0 }}>
              No CSV-imported progress and no unmatched xAPI events for <code>{decoded}</code>. This
              email may have appeared briefly in a webhook then never re-fired. {' '}
              <Link href="/admin/coursera">Back to Coursera admin →</Link>
            </p>
          </section>
        ) : null}

        {/* Unmatched xAPI events — most useful when CSV is empty.
            Reference migration to <DataTable> + <SectionHeader> primitives.
            See docs/UI-DESIGN-SYSTEM.md for the migration playbook. */}
        {xapiEvents.length > 0 ? (
          <section className="content-card" style={{ padding: '1rem 1.1rem', display: 'grid', gap: '0.6rem' }}>
            <SectionHeader
              title={`Unmatched xAPI events (${xapiEvents.length})`}
              subtitle="Real-time activity Coursera sent for this email that we couldn't link to a member. Mapping above will reprocess these."
            />
            <DataTable<UnmatchedXapiEventRow>
              columns={[
                {
                  key: 'received',
                  header: 'Received',
                  cell: (evt) => (
                    <span style={{ whiteSpace: 'nowrap' }}>{formatDateTime(evt.receivedAt)}</span>
                  ),
                },
                {
                  key: 'course',
                  header: 'Course',
                  cell: (evt) => (
                    <>
                      <strong>{evt.courseName ?? evt.courseSlug ?? '—'}</strong>
                      {evt.courseSlug && evt.courseName ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                          {evt.courseSlug}
                        </div>
                      ) : null}
                    </>
                  ),
                },
                {
                  key: 'verb',
                  header: 'Verb',
                  cell: (evt) => <code style={{ fontSize: '0.78rem' }}>{shortVerb(evt.verbId)}</code>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (evt) => (
                    <>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 999,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background:
                            evt.completionStatus === 'unmatched'
                              ? 'rgba(251, 191, 36, 0.18)'
                              : 'rgba(176, 0, 32, 0.12)',
                          color:
                            evt.completionStatus === 'unmatched'
                              ? 'rgb(180, 130, 0)'
                              : 'var(--color-error, #b00020)',
                        }}
                      >
                        {evt.completionStatus}
                      </span>
                      {evt.error ? (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--color-on-surface-variant)',
                            marginTop: '0.2rem',
                          }}
                        >
                          {evt.error}
                        </div>
                      ) : null}
                    </>
                  ),
                },
                {
                  key: 'actor',
                  header: 'Actor identifier',
                  cell: (evt) =>
                    evt.actorIdentifier ? (
                      <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>
                        {evt.actorIdentifier}
                      </code>
                    ) : (
                      '—'
                    ),
                  hideOnMobile: true,
                },
              ]}
              rows={xapiEvents}
              rowKey={(evt) => evt.id}
              density="compact"
            />
          </section>
        ) : null}

        {/* CSV-imported courses (if any). */}
        {csvDetail && csvDetail.courses.length > 0 ? (
          <section className="content-card" style={{ padding: '1rem 1.1rem', display: 'grid', gap: '0.6rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera courses (CSV)</h2>
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
                  {csvDetail.courses.map((course) => (
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

        {/* CSV-imported badges (if any). */}
        {csvDetail && csvDetail.badges.length > 0 ? (
          <section className="content-card" style={{ padding: '1rem 1.1rem', display: 'grid', gap: '0.6rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Specializations / badges (CSV)</h2>
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
                  {csvDetail.badges.map((badge) => (
                    <tr key={badge.id}>
                      <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                        <strong>{badge.badgeTitle}</strong>
                        {badge.badgeCompleted ? (
                          <span style={{ marginLeft: '0.4rem', fontSize: '0.7rem', padding: '0.1rem 0.35rem', borderRadius: '0.4rem', background: 'rgba(34, 197, 94, 0.15)', color: 'rgb(22, 163, 74)' }}>
                            completed
                          </span>
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
      </div>
    </PortalPageFrame>
  );
}
