import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { issuePlacementSurveyToken } from '@/lib/security/placementSurveyToken';
import { sendPlacementSurveyEmail } from '@/lib/email';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user || (!(await isAdmin(user.id)) && !(await isCounselor(user.id)))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { placementId } = body;
    if (!placementId) {
      return NextResponse.json({ error: 'Missing placementId' }, { status: 400 });
    }

    const placement = await prisma.$transaction((tx) => tx.placementRecord.findUnique({
      where: { id: placementId },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, enrolledProgram: true },
        },
        placementSurveys: {
          orderBy: { sentAt: 'desc' },
          take: 1,
        },
      },
    }));

    if (!placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 });
    }

    if (!placement.user?.email) {
      return NextResponse.json({ error: 'Member has no email' }, { status: 400 });
    }

    // Use the most recent survey wave, or default to thirty_day
    const latestSurvey = placement.placementSurveys[0];
    const wave = latestSurvey?.wave ?? 'thirty_day';

    let surveyId: string;
    if (latestSurvey && !latestSurvey.completedAt) {
      // Re-use existing pending survey, just refresh the token
      surveyId = latestSurvey.id;
    } else {
      // Create a new survey row if the latest is completed or none exists
      const created = await prisma.$transaction((tx) => tx.placementSurvey.create({
        data: {
          userId: placement.userId,
          placementId: placement.id,
          wave,
          sentAt: new Date(),
        },
        select: { id: true },
      }));
      surveyId = created.id;
    }

    const token = await issuePlacementSurveyToken({ surveyId, ttlSeconds: 60 * 24 * 60 * 60 });
    const surveyUrl = `${SITE_URL}/survey/placement/${encodeURIComponent(token)}`;

    const result = await sendPlacementSurveyEmail({
      to: placement.user.email,
      fullName: placement.user.fullName ?? '',
      programName: placement.user.enrolledProgram,
      surveyUrl,
      wave,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'Send failed' }, { status: 502 });
    }

    // Update sentAt on the survey row
    await prisma.$transaction((tx) => tx.placementSurvey.update({
      where: { id: surveyId },
      data: { sentAt: new Date() },
    }));

    return NextResponse.json({ success: true, surveyId, wave });
  } catch (error) {
    console.error('/admin/placement-surveys/resend error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
