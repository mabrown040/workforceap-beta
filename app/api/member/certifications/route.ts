import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { trackEvent } from '@/lib/events/track';
import { awardPoints } from '@/lib/member/points';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

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
      trackEvent({
        userId: user.id,
        eventName: 'certification_earned',
        entityType: 'UserCertification',
        metadata: { certName },
      }).catch(() => {});

      // Award points (idempotent per cert name)
      awardPoints(user.id, 'certification_earned', certName).catch(() => {});

      sendPartnerMilestoneEmail(user.id, 'Certification earned', {
        Certification: certName,
      }).catch((err) => console.error('Partner milestone email failed:', err));
    }
  } else {
    await prisma.$transaction((tx) => tx.userCertification.deleteMany({
      where: { userId: user.id, certName },
    }));
  }

  void auditLog({ actorUserId: user.id, action: 'member_certification_updated', targetType: 'User', targetId: user.id, metadata: { certName } }).catch(() => {});
  logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'updated', object: { type: 'MemberCertification', id: user.id }, result: { success: true } }).catch(() => {});
  return NextResponse.json({ success: true });

  } catch (error) {
    console.error('/member/certifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

