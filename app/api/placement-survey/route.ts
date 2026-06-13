import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { checkPlacementSurveyRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { apiError } from '@/lib/http/errorResponse';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const { success: withinLimit } = await checkPlacementSurveyRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

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

    const survey = await prisma.$transaction((tx) => tx.placementSurvey.findUnique({
      where: { id: verify.surveyId },
      select: { id: true, userId: true, placementId: true, completedAt: true },
    }));
    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }
    if (survey.completedAt) {
      return NextResponse.json({ error: 'Survey already completed' }, { status: 409 });
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
      const updated = await prisma.$transaction((tx) => tx.placementSurvey.update({
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
        select: { id: true, completedAt: true, userId: true, placementId: true, allowTestimonial: true },
      }));

      // Auto-create testimonial pipeline entry if member consented
      if (updated.allowTestimonial) {
        try {
          const member = await prisma.$transaction((tx) => tx.user.findUnique({
            where: { id: updated.userId },
            select: { enrolledProgram: true },
          }));

          // Build testimonial content from survey responses
          const parts: string[] = [];
          if (typeof whatHelpedMost === 'string' && whatHelpedMost.trim()) {
            parts.push(whatHelpedMost.trim());
          }
          if (typeof whatCouldImprove === 'string' && whatCouldImprove.trim()) {
            parts.push(`What could improve: ${whatCouldImprove.trim()}`);
          }

          const content = parts.length > 0
            ? parts.join('\n\n')
            : 'Member consented to share their placement experience.';

          await prisma.$transaction((tx) => tx.testimonial.create({
            data: {
              memberId: updated.userId,
              placementId: updated.placementId,
              programId: member?.enrolledProgram ?? null,
              content: content.slice(0, 4000),
              rating: clampRating(jobSatisfaction),
              source: 'SURVEY',
              status: 'PENDING',
              consentGiven: true,
            },
          }));
        } catch (testimonialErr) {
          // Don't fail the survey submission if testimonial creation fails
          console.error('[placement-survey] Testimonial auto-create failed:', testimonialErr);
        }
      }

      return NextResponse.json({ success: true, survey: updated });
    } catch (error) {
      // This route is reached with a single-use signed survey token. The
      // previous version returned raw `error.message` in `details`, which
      // leaked Prisma column names and stack hints to any token-holder.
      return apiError(error, {
        route: 'placement-survey/submit',
        message: 'Failed to submit survey',
      });
    }
  } catch (error) {
    return apiError(error, { route: 'placement-survey' });
  }
}
export const POST = withApiGuc(_POST);async function _GET(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const { success: withinLimit } = await checkPlacementSurveyRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    const verify = await verifyPlacementSurveyToken(token);
    if (!verify.ok) {
      const status = verify.reason === 'expired' ? 410 : 401;
      return NextResponse.json({ error: `Invalid token (${verify.reason})` }, { status });
    }

    const survey = await prisma.$transaction((tx) => tx.placementSurvey.findUnique({
      where: { id: verify.surveyId },
      select: { id: true, completedAt: true },
    }));
    if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 });

    return NextResponse.json({ exists: true, completed: !!survey.completedAt });
  } catch (error) {
    console.error('/placement-survey:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
