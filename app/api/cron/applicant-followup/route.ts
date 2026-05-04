import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendApplicantFollowupEmail, sendAdminPendingApplicantsEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';
import { isCronEnabled } from '@/lib/cron/isCronEnabled';

/**
 * Cron endpoint to send Day 3 follow-up emails to applicants.
 * Finds applications submitted 3+ days ago with status still PENDING.
 * Also pings admin with count of stale pending applications.
 * Run daily (e.g. via Vercel Cron: "0 11 * * *" for 11 AM CT).
 * Protected with CRON_SECRET header.
 */
async function handle(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  if (!(await isCronEnabled('cron_applicant_followup'))) {
    await logCronRun('cron_applicant_followup', { skipped: true, reason: 'disabled' }, 'ok');
    return NextResponse.json({ skipped: true, reason: 'disabled' });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find applications submitted 3+ days ago that are still pending.
  // Filter: skip deleted users and users who opted out of reminders.
  const staleApplications = await prisma.application.findMany({
    where: {
      status: 'PENDING',
      submittedAt: { lte: threeDaysAgo },
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
  await logCronRun('cron_applicant_followup', runResult);
  return NextResponse.json(runResult);
}

export const GET = handle;
export const POST = handle;
