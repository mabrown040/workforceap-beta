import { prisma } from '@/lib/db/prisma';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * Daily verification that member-facing cron jobs actually executed.
 *
 * Checks the cron run log for activity in the last 24 hours.
 * Alerts if any of the 7 critical crons never ran.
 */

async function handle(_request: Request) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const criticalCrons = [
    'cron_applicant_followup',
    'cron_inactive_nudge',
    'cron_inactivity_nudge',
    'cron_milestone_celebration',
    'cron_partner_outcome_digest',
    'cron_weekly_recap_email',
    'cron_weekly_recap',
  ];

  const runs = await prisma.workflowDiagnostic.findMany({
    where: {
      workflow: { in: criticalCrons },
      createdAt: { gte: oneDayAgo },
    },
    select: { workflow: true, createdAt: true, status: true },
  });

  const ranSet = new Set(runs.map((r: { workflow: string }) => r.workflow));
  const neverRan = criticalCrons.filter((name: string) => !ranSet.has(name));
  const failures = runs.filter((r: { status: string }) => r.status === 'error');

  const runResult = {
    ok: neverRan.length === 0 && failures.length === 0,
    checked: criticalCrons.length,
    ran: ranSet.size,
    neverRan,
    failures: failures.map((f: { workflow: string }) => f.workflow),
    checkedAt: now.toISOString(),
  };

  await logCronRun('cron_verification', runResult);
  return Response.json(runResult);
}

export const GET = withCronLogging('cron_verification', handle);
export const POST = withCronLogging('cron_verification', handle);
