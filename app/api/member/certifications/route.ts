import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';

const toggleSchema = z.object({
  certName: z.string().min(1).max(200),
  earned: z.boolean(),
});

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await ensureUserInDb(user);

  const certs = await prisma.userCertification.findMany({
    where: { userId: user.id },
    select: { certName: true, earnedAt: true },
  });

  return NextResponse.json({
    certifications: certs.map((c) => ({ certName: c.certName, earnedAt: c.earnedAt })),
  });
}

export async function POST(request: Request) {
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

  const { certName, earned } = parsed.data;

  if (earned) {
    const existing = await prisma.userCertification.findUnique({
      where: { userId_certName: { userId: user.id, certName } },
    });
    await prisma.userCertification.upsert({
      where: {
        userId_certName: { userId: user.id, certName },
      },
      create: {
        userId: user.id,
        certName,
        earnedAt: new Date(),
      },
      update: {},
    });
    if (!existing) {
      await sendPartnerMilestoneEmail(user.id, 'Certification earned', {
        Certification: certName,
      });
    }
  } else {
    await prisma.userCertification.deleteMany({
      where: { userId: user.id, certName },
    });
  }

  return NextResponse.json({ success: true });
}
