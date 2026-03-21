import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendAdminWeeklyRecapEmail } from '@/lib/email';

/**
 * Cron endpoint to send weekly admin recap email.
 * Runs Friday 4 PM CT (10 PM UTC: "0 22 * * 5").
 * Gathers: new applicants, placements, at-risk students, pending applications.
 * Protected with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  // At-risk students: enrolled but no events in 14+ days
  const lastEvents = await prisma.memberEvent.groupBy({
    by: ['userId'],
    _max: { createdAt: true },
  });
  const inactiveUserIds = new Set<string>();
  for (const row of lastEvents) {
    if (row._max.createdAt && row._max.createdAt < fourteenDaysAgo) {
      inactiveUserIds.add(row.userId);
    }
  }
  const atRiskStudents = await prisma.user.count({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      id: { in: [...inactiveUserIds] },
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

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    newApplicants,
    placements,
    atRiskStudents,
    pendingApplications,
    emailSent: result.ok,
  });
}
