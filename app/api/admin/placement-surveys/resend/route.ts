import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';
import { issuePlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { sendPlacementSurveyEmail } from '@/lib/email';
import { auditLog } from '@/lib/audit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
const SURVEY_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const superAdmin = await isSuperAdmin(user.id);
    const orgId = superAdmin ? null : await getActorOrganizationId(user.id).catch(() => null);

    const body = await req.json().catch(() => ({}));
    const { placementId } = body;
    if (!placementId) {
      return NextResponse.json({ error: 'Missing placementId' }, { status: 400 });
    }

    const placement = await prisma.$transaction((tx) => tx.placementRecord.findFirst({
      where: { id: placementId, ...(orgId ? { user: { organizationId: orgId } } : {}) },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, enrolledProgram: true },
        },
        placementSurveys: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    }));

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    if (!placement.user?.email) {
      return NextResponse.json({ error: 'Member has no email' }, { status: 400 });
    }

    // A provider-ambiguous attempt is the retry target even if an older
    // acceptance exists. Reuse its attempt number, token expiry, and complete
    // payload. Otherwise an intentional resend advances the persisted attempt
    // before egress so any later retry can recover the same provider key.
    const retryableSurvey = placement.placementSurveys.find(
      (candidate) => candidate.acceptedAttempt < candidate.deliveryAttempt,
    );
    const latestSurvey = retryableSurvey ?? placement.placementSurveys[0];
    const wave = latestSurvey?.wave ?? 'thirty_day';

    let survey: { id: string; tokenExpiresAt: Date; deliveryAttempt: number };
    if (retryableSurvey) {
      survey = {
        id: retryableSurvey.id,
        tokenExpiresAt: retryableSurvey.tokenExpiresAt,
        deliveryAttempt: retryableSurvey.deliveryAttempt,
      };
    } else if (latestSurvey && !latestSurvey.completedAt) {
      const tokenExpiresAt = new Date(Date.now() + SURVEY_TOKEN_TTL_MS);
      survey = await prisma.$transaction((tx) => tx.placementSurvey.update({
        where: { id: latestSurvey.id },
        data: {
          deliveryAttempt: { increment: 1 },
          tokenExpiresAt,
        },
        select: { id: true, tokenExpiresAt: true, deliveryAttempt: true },
      }));
    } else {
      // Create the initial attempt if the latest survey is completed or absent.
      survey = await prisma.$transaction((tx) => tx.placementSurvey.create({
        data: {
          userId: placement.userId,
          placementId: placement.id,
          wave,
          sentAt: null,
          tokenExpiresAt: new Date(Date.now() + SURVEY_TOKEN_TTL_MS),
          deliveryAttempt: 1,
          acceptedAttempt: 0,
        },
        select: { id: true, tokenExpiresAt: true, deliveryAttempt: true },
      }));
    }

    const surveyId = survey.id;
    const token = await issuePlacementSurveyToken({
      surveyId,
      expiresAt: survey.tokenExpiresAt,
    });
    const surveyUrl = `${SITE_URL}/survey/placement/${encodeURIComponent(token)}`;

    const result = await sendPlacementSurveyEmail({
      to: placement.user.email,
      fullName: placement.user.fullName ?? '',
      programName: placement.user.enrolledProgram,
      surveyUrl,
      wave,
      idempotencyKey: `placement-survey/${surveyId}/${survey.deliveryAttempt}`,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 502 });
    }

    // Stamp exactly the accepted attempt. If this write fails, the persisted
    // attempt remains retryable with the same provider key and payload.
    await prisma.$transaction((tx) => tx.placementSurvey.update({
      where: { id: surveyId },
      data: {
        sentAt: new Date(),
        acceptedAttempt: survey.deliveryAttempt,
      },
    }));

    auditLog({
      actorUserId: user.id,
      action: 'admin_placement_survey_resend',
      targetType: 'PlacementRecord',
      targetId: placementId,
      metadata: { surveyId, wave, targetUserId: placement.userId },
    }).catch((err) => console.error('[audit] admin_placement_survey_resend:', err));

    return NextResponse.json({ success: true, surveyId, wave });
  } catch (error) {
    console.error('/admin/placement-surveys/resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
