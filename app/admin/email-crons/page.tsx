import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { CRON_REGISTRY, CRON_CATEGORY_COLOR } from '@/lib/admin/cronRegistry';
import PageHeader from '@/components/portal/PageHeader';
import EmailCronsClient from '@/components/admin/EmailCronsClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Email & Cron Management',
  description: 'Manage automated email triggers and scheduled jobs.',
  path: '/admin/email-crons',
});

export default async function AdminEmailCronsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/email-crons');
  try { await requireAdmin(user.id); } catch { redirect('/dashboard'); }

  // Load last run for each cron from WorkflowDiagnostic
  const cronKeys = CRON_REGISTRY.map(c => c.workflowKey);
  const recentDiags = await prisma.workflowDiagnostic.findMany({
    where: { workflow: { in: cronKeys } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { id: true, workflow: true, status: true, summary: true, createdAt: true, metadata: true },
  });

  // Group by workflow key
  const runsByKey = new Map<string, typeof recentDiags>();
  for (const d of recentDiags) {
    const list = runsByKey.get(d.workflow) ?? [];
    list.push(d);
    runsByKey.set(d.workflow, list);
  }

  const cronData = CRON_REGISTRY.map(cron => {
    const runs = runsByKey.get(cron.workflowKey) ?? [];
    const last = runs[0] ?? null;
    const meta = last?.metadata as Record<string, unknown> | null;
    // Check if most recent toggle set enabled = false
    const latestToggle = runs.find(r => {
      const m = r.metadata as Record<string, unknown> | null;
      return m?.toggledBy !== undefined;
    });
    const toggleMeta = latestToggle?.metadata as Record<string, unknown> | null;
    const enabled = toggleMeta?.enabled !== false;

    return {
      ...cron,
      enabled,
      lastRunAt: last?.createdAt?.toISOString() ?? null,
      lastRunStatus: last?.status ?? null,
      lastRunSummary: last?.summary ?? null,
      recentRuns: runs.slice(0, 8).map(r => ({
        id: r.id,
        status: r.status,
        summary: r.summary ?? '',
        createdAt: r.createdAt.toISOString(),
        meta: r.metadata as Record<string, unknown> | null,
      })),
    };
  });

  // Quick stats
  const totalRuns = recentDiags.length;
  const errorRuns = recentDiags.filter(d => d.status === 'error' || d.status === 'errored').length;
  const enabledCount = cronData.filter(c => c.enabled).length;

  return (
    <div>
      <PageHeader
        title="Email &amp; Cron Management"
        subtitle="Review, trigger, enable, or disable all automated email and workflow jobs."
      />

      {/* Notice about enable/disable */}
      <div style={{ padding: '0.875rem 1rem', background: 'rgba(43,123,185,0.07)', border: '1px solid rgba(43,123,185,0.15)', borderRadius: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
        <strong style={{ color: 'var(--color-blue, #2b7bb9)' }}>How toggling works:</strong> Enabling/disabling a job records a soft flag in the run history.
        The Vercel scheduler still calls the endpoint on schedule — but the job can check this flag before sending. To permanently remove a job from the schedule,
        edit <code style={{ background: 'var(--surface-container)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>vercel.json</code>.
        Manual triggers always run regardless of enabled state.
      </div>

      <EmailCronsClient
        crons={cronData}
        categoryColors={CRON_CATEGORY_COLOR}
        initialTotalRuns={totalRuns}
        initialErrorRuns={errorRuns}
        initialEnabledCount={enabledCount}
      />
    </div>
  );
}
