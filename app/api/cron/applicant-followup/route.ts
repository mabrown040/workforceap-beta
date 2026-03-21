import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendApplicantFollowupEmail, sendAdminPendingApplicantsEmail } from '@/lib/email';

/**
 * Cron endpoint to send Day 3 follow-up emails to applicants.
 * Finds applications submitted 3+ days ago with status still PENDING.
 * Also pings admin with count of stale pending applications.
 * Run daily (e.g. via Vercel Cron: "0 11 * * *" for 11 AM CT).
 * Protected with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find applications submitted 3+ days ago that are still pending
  const staleApplications = await prisma.application.findMany({
    where: {
      status: 'PENDING',
      submittedAt: { lte: threeDaysAgo },
    },
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

  // Send follow-up to each applicant (deduplicate by user)
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
      console.error(`Applicant followup failed for user ${app.user.id}:`, err);
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
      console.error('Admin pending applicants email failed:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    staleApplications: staleApplications.length,
    applicantEmailsSent,
    adminEmailSent,
  });
}
