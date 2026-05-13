import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPlacementSurveyToken } from '@/lib/security/placementSurveyToken';

/**
 * POST /api/placement-survey
 *
 * Member submits their post-placement survey. Auth is by signed token
 * delivered in the email link (NOT body userId — see #1180 follow-up).
 * Body shape: { token, jobSatisfaction, trainingRelevance, supportQuality,
 *               whatHelpedMost, whatCouldImprove, stillEmployed,
 *               currentSalary, allowTestimonial }
 */
export async function POST(req: Request) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
  
    const tokenRaw = body.token;
    if (typeof tokenRaw !== 'string') {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
  
    const verify = await verifyPlacementSurveyToken(tokenRaw);
    if (!verify.ok) {
      const status = verify.reason === 'expired' ? 410 : 401;
      return NextResponse.json({ error: `Invalid token (${verify.reason})` }, { status });
    }
  
    const survey = await prisma.placementSurvey.findUnique({
      where: { id: verify.surveyId },
      select: { id: true, userId: true, placementId: true, completedAt: true },
    });
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }
  
    const {
      jobSatisfaction,
      trainingRelevance,
      supportQuality,
      whatHelpedMost,
      whatCouldImprove,
      stillEmployed,
      currentSalary,
      allowTestimonial,
    } = body as {
      jobSatisfaction?: number;
      trainingRelevance?: number;
      supportQuality?: number;
      whatHelpedMost?: string;
      whatCouldImprove?: string;
      stillEmployed?: boolean;
      currentSalary?: number;
      allowTestimonial?: boolean;
    };
  
    const clampRating = (v: unknown): number | null => {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.min(5, Math.max(1, Math.round(n)));
    };
  
    try {
      const updated = await prisma.placementSurvey.update({
        where: { id: survey.id },
        data: {
          jobSatisfaction: clampRating(jobSatisfaction),
          trainingRelevance: clampRating(trainingRelevance),
          supportQuality: clampRating(supportQuality),
          whatHelpedMost: typeof whatHelpedMost === 'string' ? whatHelpedMost.slice(0, 4000) : null,
          whatCouldImprove: typeof whatCouldImprove === 'string' ? whatCouldImprove.slice(0, 4000) : null,
          stillEmployed: typeof stillEmployed === 'boolean' ? stillEmployed : null,
          currentSalary:
            typeof currentSalary === 'number' && Number.isFinite(currentSalary) && currentSalary >= 0
              ? Math.round(currentSalary)
              : null,
          allowTestimonial: typeof allowTestimonial === 'boolean' ? allowTestimonial : false,
          completedAt: new Date(),
        },
        select: { id: true, completedAt: true },
      });
  
      return NextResponse.json({ success: true, survey: updated });
    } catch (error) {
      console.error('[placement-survey] Submit failed:', error);
      return NextResponse.json(
        { error: 'Failed to submit survey', details: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error('/placement-survey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/placement-survey?token=...
 *
 * Token-gated existence + completion check (used by the form page to
 * short-circuit if the survey is already filled out).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
  
    const verify = await verifyPlacementSurveyToken(token);
    if (!verify.ok) {
      const status = verify.reason === 'expired' ? 410 : 401;
      return NextResponse.json({ error: `Invalid token (${verify.reason})` }, { status });
    }
  
    const survey = await prisma.placementSurvey.findUnique({
      where: { id: verify.surveyId },
      select: { id: true, completedAt: true },
    });
    if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
  
    return NextResponse.json({ exists: true, completed: !!survey.completedAt });
  } catch (error) {
    console.error('/placement-survey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
