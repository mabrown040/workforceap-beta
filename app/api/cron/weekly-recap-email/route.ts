import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendAdminWeeklyRecapEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';

/**
 * Cron endpoint to send weekly admin recap email.
 * Runs Friday 4 PM CT (10 PM UTC: "0 22 * * 5").
 * Gathers: new applicants, placements, at-risk students, pending applications.
 * Protected with CRON_SECRET header.
 */
async function handle(request: Request) {
  const unauthorized = authorizeCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // New applicants this week (users created in last 7 days)
  const newApplicants = await prisma.user.count({
    where: {
      deletedAt: null,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  // Placements this week
  const placements = await prisma.placementRecord.count({
    where: {
      placedAt: { gte: sevenDaysAgo },
    },
  });

  // At-risk students: enrolled but no events in 14+ days.
  // PERF: Instead of unfiltered groupBy across entire member_events table,
  // find users who DO have recent events (bounded 14-day scan), then count
  // enrolled users NOT in that set.
  const recentlyActive = await prisma.memberEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: fourteenDaysAgo } },
  });
  const activeUserIds = new Set(recentlyActive.map((r) => r.userId));
  const atRiskStudents = await prisma.user.count({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      id: { notIn: [...activeUserIds] },
    },
  });

  // Pending applications
  const pendingApplications = await prisma.application.count({
    where: { status: 'PENDING' },
  });

  const result = await sendAdminWeeklyRecapEmail({
    newApplicants,
    placements,
    atRiskStudents,
    pendingApplications,
  });

  const runResult = { ok: true, checkedAt: now.toISOString(), newApplicants, placements, atRiskStudents, pendingApplications, emailSent: result.ok };
  await logCronRun('cron_weekly_recap_email', runResult, result.ok ? 'ok' : 'error');
  return NextResponse.json(runResult);
  } catch (err) {
    captureApiError(err, { route: 'cron/weekly-recap-email' });
    await logCronRun('cron_weekly_recap_email', { error: err instanceof Error ? err.message : 'unknown' }, 'error');
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
