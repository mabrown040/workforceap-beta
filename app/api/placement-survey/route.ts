import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { checkPlacementSurveyRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { apiError } from '@/lib/http/errorResponse';
import { escalateToCounselor } from '@/lib/member/counselorEscalation';

import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * PlacementRecord.retentionStatus values that are still "undecided" and
 * therefore safe for the automated survey sync below to write over. Any
 * other value (retained_90d/retained_180d/separated, or an admin's
 * active/left/unknown selection made via /api/admin/placements) is treated
 * as counselor-set and must never be silently overwritten by a survey
 * response.
 */
const PENDING_ISH_RETENTION_STATUSES = ['unknown', 'pending'] as const;

async function _POST(req: Request) {
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
      select: { id: true, userId: true, placementId: true, completedAt: true, wave: true },
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
        select: { id: true, completedAt: true, userId: true, placementId: true, allowTestimonial: true, wave: true },
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

      // Sync the canonical PlacementRecord (what board/funder reports read)
      // from this survey response. Entirely fail-soft relative to the
      // survey save above — the member's submission already succeeded.
      try {
        if (stillEmployed === false) {
          // Reported job loss. Only move retentionStatus into "separated"
          // when it's still undecided — a counselor's own retained/separated
          // call always wins.
          await prisma.$transaction((tx) => tx.placementRecord.updateMany({
            where: {
              id: updated.placementId,
              OR: [
                { retentionStatus: null },
                { retentionStatus: { in: [...PENDING_ISH_RETENTION_STATUSES] } },
              ],
            },
            data: { retentionStatus: 'separated' },
          }));

          // Escalate through the same AtRiskAlert/CounselorNote pipeline the
          // First 90 Days "having_trouble" check-in uses (see
          // lib/member/counselorEscalation.ts) so a counselor sees this in
          // their normal at-risk queue instead of the raw survey answer
          // going unnoticed.
          const summary = `Placement survey (${updated.wave.replace('_', ' ')}) reported the member is no longer employed at their placement employer.`;
          await escalateToCounselor({
            userId: updated.userId,
            factorName: 'placement_survey_job_loss_reported',
            summary,
            noteContent: `[Placement Survey] ${summary}`,
          });
        } else if (stillEmployed === true && (updated.wave === 'ninety_day' || updated.wave === 'hundred_eighty_day')) {
          // Retention window reached and the member is still employed —
          // backfill the follow-up wage (never clobbering a value someone
          // already recorded) and record the retained decision, but only
          // while it is still unset.
          if (typeof currentSalary === 'number' && Number.isFinite(currentSalary) && currentSalary >= 0) {
            await prisma.$transaction((tx) => tx.placementRecord.updateMany({
              where: { id: updated.placementId, wageAtFollowUp: null },
              data: { wageAtFollowUp: Math.round(currentSalary) },
            }));
          }

          await prisma.$transaction((tx) => tx.placementRecord.updateMany({
            where: { id: updated.placementId, retentionStatus: null },
            data: { retentionStatus: updated.wave === 'ninety_day' ? 'retained_90d' : 'retained_180d' },
          }));
        }
      } catch (retentionSyncErr) {
        // Don't fail the survey submission if the PlacementRecord sync fails.
        console.error('[placement-survey] PlacementRecord retention sync failed:', retentionSyncErr);
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
