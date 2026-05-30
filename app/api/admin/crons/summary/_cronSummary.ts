import { prisma } from '@/lib/db/prisma';

export interface CronSummary {
  totalJobs: number;
  currentlyRunning: number;
  failedLast24h: number;
  successRate24h: number;
  successRate7d: number;
  avgDurationMs: number;
}

export interface JobSummary {
  jobName: string;
  lastRunAt: Date;
  lastStatus: string;
  totalRuns: number;
  successRate: number;
}

export async function fetchCronSummary(): Promise<{ summary: CronSummary; lastRunPerJob: JobSummary[] }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalJobs,
    currentlyRunning,
    failedLast24h,
    successLast24h,
    successLast7d,
    failedLast7d,
    avgDurationLast7d,
    lastRunPerJob,
  ] = await Promise.all([
    prisma.cronExecution.count(),
    prisma.cronExecution.count({ where: { status: 'RUNNING' } }),
    prisma.cronExecution.count({ where: { status: 'FAILED', startedAt: { gte: twentyFourHoursAgo } } }),
    prisma.cronExecution.count({ where: { status: 'SUCCESS', startedAt: { gte: twentyFourHoursAgo } } }),
    prisma.cronExecution.count({ where: { status: 'SUCCESS', startedAt: { gte: sevenDaysAgo } } }),
    prisma.cronExecution.count({ where: { status: 'FAILED', startedAt: { gte: sevenDaysAgo } } }),
    prisma.cronExecution.aggregate({
      where: { status: 'SUCCESS', startedAt: { gte: sevenDaysAgo }, durationMs: { not: null } },
      _avg: { durationMs: true },
    }),
    prisma.$queryRaw<
      Array<{ job_name: string; last_run_at: Date; last_status: string; total_runs: number; success_rate: number }>
    >`
      SELECT
        job_name,
        MAX(started_at) AS last_run_at,
        (SELECT status FROM cron_executions ce2 WHERE ce2.job_name = ce.job_name ORDER BY started_at DESC LIMIT 1) AS last_status,
        COUNT(*)::int AS total_runs,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'SUCCESS') / NULLIF(COUNT(*), 0), 1)::float AS success_rate
      FROM cron_executions ce
      WHERE started_at >= ${sevenDaysAgo}
      GROUP BY job_name
      ORDER BY MAX(started_at) DESC
    `,
  ]);

  const totalLast24h = successLast24h + failedLast24h;
  const successRate24h = totalLast24h > 0 ? Math.round((successLast24h / totalLast24h) * 100) : 100;
  const totalLast7d = successLast7d + failedLast7d;
  const successRate7d = totalLast7d > 0 ? Math.round((successLast7d / totalLast7d) * 100) : 100;

  return {
    summary: {
      totalJobs,
      currentlyRunning,
      failedLast24h,
      successRate24h,
      successRate7d,
      avgDurationMs: Math.round(avgDurationLast7d._avg.durationMs ?? 0),
    },
    lastRunPerJob: lastRunPerJob.map((j) => ({
      jobName: j.job_name,
      lastRunAt: j.last_run_at,
      lastStatus: j.last_status,
      totalRuns: j.total_runs,
      successRate: j.success_rate,
    })),
  };
}
