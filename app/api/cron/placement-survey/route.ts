import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';
import { issuePlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { sendPlacementSurveyEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';

/**
 * POST /api/cron/placement-survey
 *
 * Daily cron: for each PlacementRecord placed ~30 days ago that has no
 * PlacementSurvey, create the survey row, mint a signed link, and email
 * the member. Idempotent: re-runs skip placements that already have a
 * survey row (PlacementSurvey.userId is @unique).
 */
export async function POST(req: Request) {
  try {
    const unauthorized = authorizeCronRequest(req);
    if (unauthorized) return unauthorized;
  
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
      const recentPlacements = await prisma.placementRecord.findMany({
        where: {
          placedAt: {
            gte: new Date(thirtyDaysAgo.getTime() - 24 * 60 * 60 * 1000),
            lte: new Date(thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000),
          },
          user: { placementSurveys: { none: {} } },
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
        take: 100,
      });
  
      const sent: Array<{ userId: string; email: string }> = [];
      const skipped: Array<{ userId: string; reason: string }> = [];
      const emailFailures: Array<{ userId: string; error: string }> = [];
  
      for (const placement of recentPlacements) {
        const user = placement.user;
        if (!user?.email) {
          skipped.push({ userId: placement.userId, reason: 'No email on user' });
          continue;
        }
  
        // Skip if a survey row already exists for this user.
        const existing = await prisma.placementSurvey.findFirst({
          where: { userId: placement.userId },
          select: { id: true },
        });
        if (existing) {
          skipped.push({ userId: placement.userId, reason: 'Survey already exists' });
          continue;
        }
  
        const survey = await prisma.placementSurvey.create({
          data: {
            userId: placement.userId,
            placementId: placement.id,
            sentAt: new Date(),
          },
          select: { id: true },
        });
  
        const token = await issuePlacementSurveyToken({ surveyId: survey.id });
        const surveyUrl = `${SITE_URL}/placement-survey?token=${encodeURIComponent(token)}`;
  
        const result = await sendPlacementSurveyEmail({
          to: user.email,
          fullName: user.fullName ?? '',
          programName: user.enrolledProgram,
          surveyUrl,
        });
  
        if (result.ok) {
          sent.push({ userId: placement.userId, email: user.email });
        } else {
          emailFailures.push({ userId: placement.userId, error: result.error ?? 'Unknown send error' });
        }
      }
  
      return NextResponse.json({
        success: true,
        sent: sent.length,
        skipped: skipped.length,
        emailFailures: emailFailures.length,
        sentList: sent,
        skippedList: skipped,
        emailFailureList: emailFailures,
      });
    } catch (error) {
      console.error('[placement-survey-cron] Failed:', error);
      return NextResponse.json(
        { error: 'Failed to send surveys', details: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('/cron/placement-survey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
