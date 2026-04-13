import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';

/**
 * POST /api/cron/inactivity-nudge
 *
 * Sends a re-engagement nudge to members who have been inactive
 * for 14+ days. Capped at 100/run to avoid spam. Secured by CRON_SECRET.
 *
 * Deploy with Vercel Cron: schedule "0 10 * * 3" (Wednesday 10AM UTC)
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Find enrolled members with no events in 14 days
  const recentActiveUserIds = await prisma.memberEvent.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const activeSet = new Set(recentActiveUserIds.map(r => r.userId));

  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      id: { notIn: [...activeSet] },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true, enrolledAt: true },
    take: 100,
    orderBy: { enrolledAt: 'asc' },
  });

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    try {
      await sendInactiveNudgeEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
      });
      sent++;
    } catch (e) {
      console.error('[cron/inactivity-nudge] failed for', member.email, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: members.length });
}
