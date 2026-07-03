import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createNotification } from '@/lib/notifications/create';
import { sendEmployerPendingApplicantsEmail, sendAdminStaleApplicantsDigestEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

const JOB_NAME = 'cron_employer_pending_applicants';

/** Employers with this many or more stale applicants get called out in the admin digest. */
const ADMIN_DIGEST_THRESHOLD = 10;

/** Applications waiting this long (in either pending or reviewing) count as "stale". */
const STALE_DAYS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Weekly employer nudge (Tuesdays 16:00, see vercel.json).
 *
 * Finds JobPostingApplication rows stuck in pending/reviewing for 5+ days,
 * groups them by employer (via a single groupBy + one batched job lookup —
 * no per-row queries), and sends each affected employer an in-app
 * notification + email: "N candidates are waiting on M of your job posts".
 * Employers with a heavy backlog (10+ stale applicants) are also called out
 * in a single admin digest email.
 */
async function handle(_request: Request) {
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - STALE_DAYS * MS_PER_DAY);

  // Batch query #1: stale applications grouped by job, with the oldest
  // appliedAt per job so we can compute "oldest waiting" per employer below.
  const staleGroups = await prisma.jobPostingApplication.groupBy({
    by: ['jobId'],
    where: {
      status: { in: ['pending', 'reviewing'] },
      appliedAt: { lte: staleCutoff },
    },
    _count: { _all: true },
    _min: { appliedAt: true },
  });

  const runResult = {
    ok: true,
    checkedAt: now.toISOString(),
    staleGroups: staleGroups.length,
    employersNotified: 0,
    adminDigestSent: false,
  };

  if (staleGroups.length === 0) {
    await setCronRecordsProcessed(0);
    await logCronRun(JOB_NAME, runResult);
    return NextResponse.json(runResult);
  }

  // Batch query #2: resolve the owning employer for every affected job in
  // one lookup (never one query per job/employer).
  const jobIds = staleGroups.map((g) => g.jobId);
  const jobs = await prisma.job.findMany({
    where: { id: { in: jobIds } },
    select: {
      id: true,
      employerId: true,
      employer: { select: { userId: true, companyName: true, contactEmail: true } },
    },
  });
  const jobById = new Map(jobs.map((j) => [j.id, j]));

  type EmployerAgg = {
    employerId: string;
    userId: string;
    companyName: string;
    contactEmail: string | null;
    candidateCount: number;
    jobIds: Set<string>;
    oldestAppliedAt: Date;
  };
  const byEmployer = new Map<string, EmployerAgg>();

  for (const group of staleGroups) {
    const job = jobById.get(group.jobId);
    if (!job) continue;
    const count = group._count._all;
    const oldest = group._min.appliedAt ?? now;

    let agg = byEmployer.get(job.employerId);
    if (!agg) {
      agg = {
        employerId: job.employerId,
        userId: job.employer.userId,
        companyName: job.employer.companyName,
        contactEmail: job.employer.contactEmail,
        candidateCount: 0,
        jobIds: new Set(),
        oldestAppliedAt: oldest,
      };
      byEmployer.set(job.employerId, agg);
    }
    agg.candidateCount += count;
    agg.jobIds.add(group.jobId);
    if (oldest < agg.oldestAppliedAt) agg.oldestAppliedAt = oldest;
  }

  let employersNotified = 0;
  const staleForAdminDigest: { companyName: string; candidateCount: number }[] = [];

  for (const agg of byEmployer.values()) {
    const jobsAffected = agg.jobIds.size;
    const oldestWaitingDays = Math.max(0, Math.floor((now.getTime() - agg.oldestAppliedAt.getTime()) / MS_PER_DAY));

    try {
      await createNotification({
        userId: agg.userId,
        type: 'task_assigned',
        title: `${agg.candidateCount} candidate${agg.candidateCount === 1 ? '' : 's'} waiting on ${jobsAffected} of your job post${jobsAffected === 1 ? '' : 's'}`,
        body: `The longest-waiting application has been sitting for ${oldestWaitingDays} day${oldestWaitingDays === 1 ? '' : 's'}. Review your applicants to keep candidates engaged.`,
        data: { link: '/employer/applications' },
      });

      if (agg.contactEmail) {
        await sendEmployerPendingApplicantsEmail({
          to: agg.contactEmail,
          candidateCount: agg.candidateCount,
          jobsAffected,
          oldestWaitingDays,
        }).catch(() => { /* non-fatal — notification already sent */ });
      }

      employersNotified++;
    } catch (err) {
      captureApiError(err, { route: 'cron/employer-pending-applicants', extra: { employerId: agg.employerId } });
    }

    if (agg.candidateCount >= ADMIN_DIGEST_THRESHOLD) {
      staleForAdminDigest.push({ companyName: agg.companyName, candidateCount: agg.candidateCount });
    }
  }

  let adminDigestSent = false;
  if (staleForAdminDigest.length > 0) {
    try {
      const result = await sendAdminStaleApplicantsDigestEmail({ employers: staleForAdminDigest });
      adminDigestSent = result.ok;
    } catch (err) {
      captureApiError(err, { route: 'cron/employer-pending-applicants/admin-digest' });
    }
  }

  const finalResult = {
    ...runResult,
    employersNotified,
    adminDigestSent,
    employersOverThreshold: staleForAdminDigest.length,
  };
  await setCronRecordsProcessed(employersNotified);
  await logCronRun(JOB_NAME, finalResult);
  return NextResponse.json(finalResult);
}

export const GET = withCronLogging(JOB_NAME, handle);
export const POST = withCronLogging(JOB_NAME, handle);
