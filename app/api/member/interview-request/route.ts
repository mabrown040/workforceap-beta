import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { awardPoints } from '@/lib/member/points';

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      interviewEligible: true,
      interviewRequestedAt: true,
      interviewCompletedAt: true,
      phone: true,
      profile: { select: { profileAddress: true } },
    },
  });

  if (!row?.interviewEligible) {
    return NextResponse.json({ error: 'Complete pre-screening before requesting an interview.' }, { status: 400 });
  }
  if (row.interviewCompletedAt) {
    return NextResponse.json({ error: 'Interview is already marked complete.' }, { status: 400 });
  }
  if (row.interviewRequestedAt) {
    return NextResponse.json({ ok: true, alreadyRequested: true });
  }

  const phoneOk = (row.phone?.trim().length ?? 0) >= 10;
  const addrOk = (row.profile?.profileAddress?.trim().length ?? 0) >= 5;
  if (!phoneOk || !addrOk) {
    return NextResponse.json(
      { error: 'Add your phone and physical address in Profile before scheduling.' },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { interviewRequestedAt: new Date() },
  });

  // Award points (idempotent — fixed entityId means only the first request awards)
  awardPoints(user.id, 'interview_requested', 'first-request').catch(() => {});

  return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to process interview request' }, { status: 500 });
  }
}
