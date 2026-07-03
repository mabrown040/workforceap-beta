import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications/create';
import { sendEmployerJobExpiryEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { invalidateJobListings } from '@/lib/jobs/listingCache';

const JOB_NAME = 'cron_job_expiry';

/**
 * Daily job auto-expiry (07:45 UTC, see vercel.json).
 *
 * Closes any 'live' job whose expiresAt has passed. Reads the affected rows
 * first (one lean query) so we can notify each employer once per run, then
 * flips them all with a single updateMany — no per-job update loop.
 */
async function handle(_request: Request) {
  const now = new Date();

  const expiring = await prisma.job.findMany({
    where: {
      status: 'live',
      expiresAt: { lt: now },
    },
    select: {
      id: true,
      employerId: true,
      employer: { select: { userId: true, contactEmail: true } },
    },
  });

  if (expiring.length === 0) {
    const runResult = { ok: true, checkedAt: now.toISOString(), expiredCount: 0, employersNotified: 0 };
    await setCronRecordsProcessed(0);
    await logCronRun(JOB_NAME, runResult);
    return NextResponse.json(runResult);
  }

  const expiringIds = expiring.map((j) => j.id);
  const { count } = await prisma.job.updateMany({
    where: { id: { in: expiringIds }, status: 'live' },
    data: { status: 'closed' },
  });

  await invalidateJobListings().catch(() => {});

  // Batch per employer (one notification/email per employer per run, not per job).
  const byEmployer = new Map<string, { userId: string; contactEmail: string | null; count: number }>();
  for (const job of expiring) {
    const existing = byEmployer.get(job.employerId);
    if (existing) {
      existing.count++;
    } else {
      byEmployer.set(job.employerId, {
        userId: job.employer.userId,
        contactEmail: job.employer.contactEmail,
        count: 1,
      });
    }
  }

  let employersNotified = 0;
  for (const [employerId, agg] of byEmployer) {
    try {
      await createNotification({
        userId: agg.userId,
        type: 'task_assigned',
        title: `${agg.count} of your job post${agg.count === 1 ? '' : 's'} expired`,
        body: `${agg.count} job post${agg.count === 1 ? '' : 's'} reached its expiration date and ${agg.count === 1 ? 'was' : 'were'} automatically closed. Repost or extend to keep hiring.`,
        data: { link: '/employer/jobs' },
      });

      if (agg.contactEmail) {
        await sendEmployerJobExpiryEmail({ to: agg.contactEmail, expiredCount: agg.count }).catch(() => {
          /* non-fatal — notification already sent */
        });
      }

      employersNotified++;
    } catch (err) {
      captureApiError(err, { route: 'cron/job-expiry', extra: { employerId } });
    }
  }

  const runResult = {
    ok: true,
    checkedAt: now.toISOString(),
    expiredCount: count,
    employersNotified,
  };
  await setCronRecordsProcessed(count);
  await logCronRun(JOB_NAME, runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging(JOB_NAME, handle);
export const POST = withCronLogging(JOB_NAME, handle);
