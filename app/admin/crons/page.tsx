import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';
import { prisma } from '@/lib/db/prisma';
import AdminCronsClient from '@/components/admin/AdminCronsClient';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Cron monitoring',
    description: 'Monitor cron job executions, success rates, and failures.',
    path: '/admin/crons',
  });
}

const STATUS_COLOR: Record<string, string> = {
  SUCCESS: 'rgba(74,155,79,0.12)',
  FAILED: 'rgba(173,44,77,0.1)',
  RUNNING: 'rgba(43,123,185,0.1)',
  SKIPPED: 'rgba(255,187,0,0.1)',
};

const STATUS_TEXT_COLOR: Record<string, string> = {
  SUCCESS: 'var(--color-green, #4a9b4f)',
  FAILED: 'var(--color-accent)',
  RUNNING: 'var(--color-blue, #2b7bb9)',
  SKIPPED: 'var(--color-gold)',
};

export default async function AdminCronsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/crons');
  if (!(await isAdmin(user.id))) redirect('/dashboard');

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalJobs,
    currentlyRunning,
    failedLast24h,
    successLast24h,
    avgDurationLast7d,
    recentExecutions,
    distinctJobNames,
  ] = await Promise.all([
    prisma.cronExecution.count(),
    prisma.cronExecution.count({ where: { status: 'RUNNING' } }),
    prisma.cronExecution.count({ where: { status: 'FAILED', startedAt: { gte: twentyFourHoursAgo } } }),
    prisma.cronExecution.count({ where: { status: 'SUCCESS', startedAt: { gte: twentyFourHoursAgo } } }),
    prisma.cronExecution.aggregate({
      where: { status: 'SUCCESS', startedAt: { gte: sevenDaysAgo }, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
    prisma.cronExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    }),
    prisma.cronExecution.groupBy({
      by: ['jobName'],
      _count: { jobName: true },
      orderBy: { jobName: 'asc' },
    }),
  ]);

  const totalLast24h = successLast24h + failedLast24h;
  const successRate24h = totalLast24h > 0 ? Math.round((successLast24h / totalLast24h) * 100) : 100;

  return (
    <div>
      <PageHeader
        title="Cron Monitoring"
        subtitle="Track cron job health, success rates, and recent executions."
      />

      {/* Summary cards */}
      <div className="portal-metric-strip" style={{ marginBottom: '1.5rem' }}>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>schedule</span>
          </div>
          <p className="portal-metric-card__value">{totalJobs}</p>
          <p className="portal-metric-card__label">Total Runs</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--green">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <p className="portal-metric-card__value">{successRate24h}%</p>
          <p className="portal-metric-card__label">Success Rate (24h)</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--accent">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>error</span>
          </div>
          <p className="portal-metric-card__value" style={{ color: failedLast24h > 0 ? 'var(--color-accent)' : undefined }}>{failedLast24h}</p>
          <p className="portal-metric-card__label">Failed (24h)</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--gold">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>play_circle</span>
          </div>
          <p className="portal-metric-card__value" style={{ color: currentlyRunning > 0 ? 'var(--color-blue)' : undefined }}>{currentlyRunning}</p>
          <p className="portal-metric-card__label">Running</p>
        </div>
        <div className="portal-metric-card">
          <div className="portal-metric-card__icon-wrap portal-metric-card__icon-wrap--blue">
            <span className="material-symbols-outlined" style={{ fontSize: '1rem', fontVariationSettings: "'FILL' 1" }}>timer</span>
          </div>
          <p className="portal-metric-card__value">
            {avgDurationLast7d._avg.durationMs
              ? `${Math.round((avgDurationLast7d._avg.durationMs ?? 0) / 1000)}s`
              : '—'}
          </p>
          <p className="portal-metric-card__label">Avg Duration (7d)</p>
        </div>
      </div>

      <AdminCronsClient
        initialExecutions={recentExecutions}
        jobNames={distinctJobNames.map((j) => j.jobName)}
      />
    </div>
  );
}
