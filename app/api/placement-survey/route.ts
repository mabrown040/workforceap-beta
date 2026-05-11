import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/placement-survey
 * Member submits their post-placement survey.
 * No auth required — link contains a signed token.
 */
export async function POST(req: Request) {
  try {
    const { token, ...responses } = await req.json();
    
    // TODO: Verify token (JWT with userId + placementId)
    // For now, accept userId directly (production should use signed tokens)
    const { userId, placementId, jobSatisfaction, trainingRelevance, supportQuality, whatHelpedMost, whatCouldImprove, stillEmployed, currentSalary, allowTestimonial } = responses;
    
    if (!userId || !placementId) {
      return NextResponse.json({ error: 'Missing userId or placementId' }, { status: 400 });
    }

    const survey = await prisma.placementSurvey.upsert({
      where: { userId },
      update: {
        jobSatisfaction,
        trainingRelevance,
        supportQuality,
        whatHelpedMost,
        whatCouldImprove,
        stillEmployed,
        currentSalary,
        allowTestimonial,
        completedAt: new Date(),
      },
      create: {
        userId,
        placementId,
        jobSatisfaction,
        trainingRelevance,
        supportQuality,
        whatHelpedMost,
        whatCouldImprove,
        stillEmployed,
        currentSalary,
        allowTestimonial,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, survey });
  } catch (error) {
    console.error('[placement-survey] Submit failed:', error);
    return NextResponse.json(
      { error: 'Failed to submit survey', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/placement-survey?userId=xxx
 * Check if survey exists for a member.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const survey = await prisma.placementSurvey.findUnique({
      where: { userId },
    });
    return NextResponse.json({ exists: !!survey, survey });
  } catch (error) {
    console.error('[placement-survey] Fetch failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch survey', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
