import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { FUNNEL_DEFINITIONS } from '@/lib/events/catalog';
import { recordWorkflowDiagnostic } from '@/lib/diagnostics';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Admin diagnostics',
  description: 'Recent workflow diagnostics for imports, recommendations, and review queues.',
  path: '/admin/diagnostics',
});

export default async function AdminDiagnosticsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/diagnostics');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  await recordWorkflowDiagnostic({
    workflow: 'admin_diagnostics',
    status: 'inspection',
    actorUserId: user.id,
    summary: 'Admin opened diagnostics view',
    method: 'page_load',
  });

  const [recentDiagnostics, recentImports, recentRecommendations, enrolledUsersForDrift] = await Promise.all([
    prisma.workflowDiagnostic.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.workflowDiagnostic.findMany({ where: { workflow: { startsWith: 'employer_import' } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.workflowDiagnostic.findMany({ where: { workflow: { in: ['admin_job_matches', 'admin_match_suggestions'] } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.user.findMany({
      where: { enrolledProgram: { not: null }, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        enrolledProgram: true,
        courseEnrollment: { select: { programSlug: true } },
      },
      take: 500,
    }),
  ]);

  const driftRecords = enrolledUsersForDrift.filter((u) =>
    !u.courseEnrollment || u.enrolledProgram !== u.courseEnrollment.programSlug
  );

  return (
    <div>
      <PageHeader
        title="Diagnostics"
        subtitle="Trace brittle workflows, fallback paths, and likely abandonment moments across key admin workflows."
      />

      {/* Enrollment drift detection */}
      <section style={{ marginBottom: '2rem' }}>
        <h2 className="portal-section-heading">
          Enrollment drift {driftRecords.length > 0 ? `(${driftRecords.length} found)` : ''}
        </h2>
        {driftRecords.length === 0 ? (
          <div className="portal-card portal-card--flat portal-card--padded" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-green)', fontSize: '1.25rem' }}>check_circle</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>
              No enrollment drift detected. User.enrolledProgram and CourseEnrollment are in sync for all {enrolledUsersForDrift.length} enrolled members.
            </span>
          </div>
        ) : (
          <div className="portal-card portal-card--flat" style={{ overflow: 'auto' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>User.enrolledProgram</th>
                  <th>CourseEnrollment</th>
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {driftRecords.slice(0, 25).map((u) => (
                  <tr key={u.id}>
                    <td>
                      <a href={`/admin/members/${u.id}/lifecycle`} style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 500 }}>
                        {u.fullName ?? u.id}
                      </a>
                    </td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{u.enrolledProgram}</td>
                    <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' }}>{u.courseEnrollment?.programSlug ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-accent)' }}>
                      {!u.courseEnrollment ? 'No CourseEnrollment record' : 'Program slug mismatch'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {driftRecords.length > 25 && (
              <p style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                Showing 25 of {driftRecords.length}. Use the <a href="/api/admin/lifecycle/drift" style={{ color: 'var(--color-accent)' }}>drift API</a> for full results.
              </p>
            )}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="portal-section-heading">Key funnels and signals</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {FUNNEL_DEFINITIONS.map((funnel) => (
            <article key={funnel.funnel} className="admin-card" style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ marginBottom: '0.35rem', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem' }}>
                {funnel.audience}
              </p>
              <h3 style={{ marginBottom: '0.75rem' }}>{funnel.funnel}</h3>
              <p><strong>Steps:</strong> {funnel.steps.join(' → ')}</p>
              <p><strong>Outcomes:</strong> {funnel.outcomes.join(' · ')}</p>
              <p><strong>Abandonment / confusion:</strong> {funnel.confusionSignals.join(' · ')}</p>
              <p><strong>False confidence:</strong> {funnel.falseConfidenceSignals.join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="portal-section-heading">Recent import diagnostics</h2>
        <DiagnosticsTable rows={recentImports} />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 className="portal-section-heading">Recent recommendation diagnostics</h2>
        <DiagnosticsTable rows={recentRecommendations} />
      </section>

      <section>
        <h2 className="portal-section-heading">Latest workflow log</h2>
        <DiagnosticsTable rows={recentDiagnostics} />
      </section>
    </div>
  );
}

type DiagnosticRow = Awaited<ReturnType<typeof prisma.workflowDiagnostic.findMany>>[number];

function DiagnosticsTable({ rows }: { rows: DiagnosticRow[] }) {
  if (rows.length === 0) {
    return <p style={{ color: 'var(--color-on-surface-variant)' }}>No diagnostics captured yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="admin-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Workflow</th>
            <th>Status</th>
            <th>Provider / method</th>
            <th>Fallback / failure</th>
            <th>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.createdAt.toLocaleString()}</td>
              <td>{row.workflow}</td>
              <td>{row.status}</td>
              <td>{[row.provider, row.method].filter(Boolean).join(' / ') || '—'}</td>
              <td>{[row.fallbackPath, row.failureReason].filter(Boolean).join(' / ') || '—'}</td>
              <td>
                <div>{row.summary}</div>
                {row.metadata ? (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                    {JSON.stringify(row.metadata, null, 2)}
                  </pre>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
