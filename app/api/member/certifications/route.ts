import { NextResponse, after } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { trackEvent } from '@/lib/events/track';
import { awardPoints } from '@/lib/member/points';
import { createNotification } from '@/lib/notifications/create';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const toggleSchema = z.object({
  certName: z.string().min(1).max(200),
  earned: z.boolean(),
  earnedAt: z.string().datetime().optional(), // ISO string from manual add form
});async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDb(user);

  const certs = await prisma.$transaction((tx) => tx.userCertification.findMany({
    where: { userId: user.id },
    select: { certName: true, earnedAt: true },
    take: 100,
  }));

  return NextResponse.json({
    certifications: certs.map((c) => ({ certName: c.certName, earnedAt: c.earnedAt })),
  });

  } catch (error) {
    console.error('/member/certifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDb(user);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { certName, earned, earnedAt: earnedAtStr } = parsed.data;
  // Use the user-provided date if supplied and valid, otherwise default to now
  const earnedAt = earnedAtStr ? new Date(earnedAtStr) : new Date();

  if (earned) {
    const existing = await prisma.$transaction((tx) => tx.userCertification.findUnique({
      where: { userId_certName: { userId: user.id, certName } },
    }));
    await prisma.$transaction((tx) => tx.userCertification.upsert({
      where: {
        userId_certName: { userId: user.id, certName },
      },
      create: {
        userId: user.id,
        certName,
        earnedAt,
      },
      update: {
        // Update earnedAt only when a specific date is provided (manual add)
        ...(earnedAtStr ? { earnedAt } : {}),
      },
    }));
    if (!existing) {
      // Lifecycle event: certification_earned
      after(() =>
        trackEvent({
          userId: user.id,
          eventName: 'certification_earned',
          entityType: 'UserCertification',
          metadata: { certName },
        }).catch(() => {})
      );

      // Award points (idempotent per cert name)
      after(() => awardPoints(user.id, 'certification_earned', certName).catch(() => {}));

      after(() =>
        createNotification({
          userId: user.id,
          type: 'certificate_earned',
          title: `You earned ${certName}!`,
          body: 'Add it to your resume and check out jobs matched to your new credential.',
          data: { link: '/dashboard/jobs' },
        }).catch(() => {})
      );

      after(() =>
        sendPartnerMilestoneEmail(user.id, 'Certification earned', {
          Certification: certName,
        }).catch((err) => console.error('Partner milestone email failed:', err))
      );
    }
  } else {
    await prisma.$transaction((tx) => tx.userCertification.deleteMany({
      where: { userId: user.id, certName },
    }));
  }

  return NextResponse.json({ success: true });

  } catch (error) {
    console.error('/member/certifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

