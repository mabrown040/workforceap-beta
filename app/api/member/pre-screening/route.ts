import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { sendPreScreeningReadyEmail } from '@/lib/email';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const schema = z.object({
  employmentStatus: z.enum(['Employed', 'Unemployed', 'Underemployed', 'Student']),
  primaryGoal: z.enum(['New career', 'Promotion', 'Certification', 'Exploring options']),
  weeklyHours: z.enum(['<5 hrs', '5-10 hrs', '10-20 hrs', '20+ hrs']),
  barrier: z.string().trim().min(1).max(200),
  hearAbout: z.string().trim().min(1).max(200),
  hearAboutOther: z.string().trim().max(200).optional().nullable(),
  workforceAssistance: z.boolean(),
  phone: z.string().trim().min(10).max(50),
  address: z.string().trim().min(5).max(500),
});async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.$transaction((tx) => tx.preScreeningResponse.findUnique({
    where: { userId: user.id },
  }));
  return NextResponse.json({ response: row });

  } catch (error) {
    console.error('/member/pre-screening error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { assessmentCompleted: true },
  }));
  if (!dbUser?.assessmentCompleted) {
    return NextResponse.json({ error: 'Complete your assessment first.' }, { status: 400 });
  }

  const existing = await prisma.$transaction((tx) => tx.preScreeningResponse.findUnique({
    where: { userId: user.id },
    select: { id: true },
  }));
  if (existing) {
    return NextResponse.json({ error: 'Pre-screening already submitted.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const organizationId = await getDefaultOrganizationId();

  await prisma.$transaction(async (tx) => {
    await tx.preScreeningDraft.deleteMany({ where: { userId: user.id } });
    await tx.preScreeningResponse.create({
      data: {
        userId: user.id,
        organizationId,
        employmentStatus: parsed.data.employmentStatus,
        primaryGoal: parsed.data.primaryGoal,
        weeklyHours: parsed.data.weeklyHours,
        barrier: parsed.data.barrier,
        hearAbout: parsed.data.hearAbout,
        hearAboutOther: parsed.data.hearAboutOther ?? null,
        workforceAssistance: parsed.data.workforceAssistance,
      },
    });
    await tx.user.update({
      where: { id: user.id },
      data: {
        phone: parsed.data.phone,
        interviewEligible: true,
      },
    });
    await tx.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        profilePhone: parsed.data.phone,
        profileAddress: parsed.data.address,
      },
      update: {
        profilePhone: parsed.data.phone,
        profileAddress: parsed.data.address,
      },
    });
  });

  const dbAfter = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { fullName: true, email: true },
  }));

  sendPreScreeningReadyEmail({
    memberName: dbAfter?.fullName ?? undefined,
    memberEmail: dbAfter?.email ?? user.email ?? '',
    goal: parsed.data.primaryGoal,
    weeklyHours: parsed.data.weeklyHours,
    barrierSummary: parsed.data.barrier.slice(0, 120),
    memberId: user.id,
  }).catch((err) => console.error('Pre-screening admin email failed:', err));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/member/pre-screening error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

