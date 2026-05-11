import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/cron/placement-survey
 * Daily cron: sends post-placement surveys to members placed 30 days ago
 * who haven't received a survey yet.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const windowStart = new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000); // 31 days ago
    const windowEnd = new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000); // 29 days ago

    // Find users with a placement from ~30 days ago and no survey yet
    const users = await prisma.user.findMany({
      where: {
        placementRecord: {
          placedAt: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        placementSurvey: null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        enrolledProgram: true,
        placementRecord: {
          select: {
            id: true,
            placedAt: true,
          },
        },
      },
    });

    const sent: Array<{ userId: string; email: string }> = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const user of users) {
      if (!user.email) {
        skipped.push({ userId: user.id, reason: 'No email' });
        continue;
      }
      if (!user.placementRecord) {
        skipped.push({ userId: user.id, reason: 'No placement record' });
        continue;
      }

      // Create survey record
      await prisma.placementSurvey.create({
        data: {
          userId: user.id,
          placementId: user.placementRecord.id,
          sentAt: new Date(),
        },
      });

      // TODO: Send email with survey link
      console.log(`[placement-survey] Survey queued for ${user.email} (placed ${user.placementRecord.placedAt.toISOString()})`);
      sent.push({ userId: user.id, email: user.email });
    }

    return NextResponse.json({
      success: true,
      sent: sent.length,
      skipped: skipped.length,
      sentList: sent,
      skippedList: skipped,
    });
  } catch (error) {
    console.error('[placement-survey-cron] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to send surveys', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
