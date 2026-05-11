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

    // Find placements from ~30 days ago without surveys
    const recentPlacements = await prisma.placementRecord.findMany({
      where: {
        placedAt: {
          gte: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000), // 31 days ago
          lte: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000), // 29 days ago
        },
        placementSurvey: null, // no survey sent yet
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            enrolledProgram: true,
          },
        },
      },
    });

    const sent: Array<{ userId: string; email: string }> = [];
    const skipped: Array<{ userId: string; reason: string }> = [];

    for (const placement of recentPlacements) {
      if (!placement.user?.email) {
        skipped.push({ userId: placement.userId, reason: 'No email' });
        continue;
      }

      // Create survey record
      await prisma.placementSurvey.create({
        data: {
          userId: placement.userId,
          placementId: placement.id,
          sentAt: new Date(),
        },
      });

      // TODO: Send email with survey link
      // For now, log it
      console.log(`[placement-survey] Survey queued for ${placement.user.email} (placed ${placement.placedAt.toISOString()})`);
      sent.push({ userId: placement.userId, email: placement.user.email });
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
