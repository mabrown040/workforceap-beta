import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendApplicantFollowupEmail, sendAdminPendingApplicantsEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

/**
 * Cron endpoint to send Day 3 follow-up emails to applicants.
 * Finds applications submitted 3+ days ago with status still PENDING.
 * Also pings admin with count of stale pending applications.
 * Runs every 3 days (scheduled via Vercel Cron).
 * Uses a 3–6 day submission window so each applicant receives at most one follow-up.
 * Protected with CRON_SECRET header.
 */
async function handle(_request: Request) {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const sixDaysAgo = new Date(now);
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  // Find applications submitted 3–6 days ago that are still pending.
  // This window ensures each applicant receives only one Day-3 follow-up
  // regardless of how long their application stays pending.
  const staleApplications = await prisma.application.findMany({
    where: {
      status: 'PENDING',
      submittedAt: { gte: sixDaysAgo, lte: threeDaysAgo },
      user: { deletedAt: null, notificationsReminders: true },
    },
    take: 500,
    include: {
      user: {
        select: { id: true, email: true, fullName: true },
      },
    },
  });

  // Calculate expected response date (5 business days from submission)
  function addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const dow = result.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return result;
  }

  let applicantEmailsSent = 0;

  // Send follow-up to each unique applicant
  const seenUsers = new Set<string>();
  for (const app of staleApplications) {
    if (seenUsers.has(app.user.id)) continue;
    seenUsers.add(app.user.id);

    const expectedDate = addBusinessDays(
      app.submittedAt ?? app.createdAt,
      5
    ).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    try {
      const result = await sendApplicantFollowupEmail({
        to: app.user.email,
        fullName: app.user.fullName,
        expectedDate,
      });
      if (result.ok) applicantEmailsSent++;
    } catch (err) {
      captureApiError(err, { route: 'cron/applicant-followup', extra: { userId: app.user.id } });
    }
  }

  // Send admin alert if there are stale applications
  let adminEmailSent = false;
  if (staleApplications.length > 0) {
    try {
      const result = await sendAdminPendingApplicantsEmail({
        pendingCount: staleApplications.length,
      });
      adminEmailSent = result.ok;
    } catch (err) {
      captureApiError(err, { route: 'cron/applicant-followup/admin-alert' });
    }
  }

  const runResult = { ok: true, checkedAt: now.toISOString(), staleApplications: staleApplications.length, uniqueApplicants: seenUsers.size, applicantEmailsSent, adminEmailSent };
  await setCronRecordsProcessed(applicantEmailsSent);
  await logCronRun('cron_applicant_followup', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_applicant_followup', handle);
export const POST = withCronLogging('cron_applicant_followup', handle);
