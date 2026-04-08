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

  const [recentDiagnostics, recentImports, recentRecommendations] = await Promise.all([
    prisma.workflowDiagnostic.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.workflowDiagnostic.findMany({ where: { workflow: { startsWith: 'employer_import' } }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.workflowDiagnostic.findMany({ where: { workflow: { in: ['admin_job_matches', 'admin_match_suggestions'] } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Diagnostics"
        subtitle="Trace brittle workflows, fallback paths, and likely abandonment moments across key admin workflows."
      />

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Key funnels and signals</h2>
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
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent import diagnostics</h2>
        <DiagnosticsTable rows={recentImports} />
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Recent recommendation diagnostics</h2>
        <DiagnosticsTable rows={recentRecommendations} />
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Latest workflow log</h2>
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
