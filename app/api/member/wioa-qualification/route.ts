import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { computeWioaSignal, parseWioaAnswers, type WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { sendWioaScreeningNotification } from '@/lib/wioa/wioaNotification';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { wioaQualificationJson: true },
  }));

  return NextResponse.json({ snapshot: row?.wioaQualificationJson ?? null });

  } catch (error) {
    console.error('/member/wioa-qualification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: Request) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const answers = parseWioaAnswers(body);
  if (!answers) {
    return NextResponse.json({ error: 'Invalid answers' }, { status: 400 });
  }

  const { signal, reasons } = computeWioaSignal(answers);
  const snapshot: WioaQualificationSnapshot = {
    version: 1,
    submittedAt: new Date().toISOString(),
    answers,
    signal,
    reasons,
  };

  await prisma.$transaction((tx) => tx.user.update({
    where: { id: user.id },
    data: {
      wioaQualificationJson: snapshot as object,
      wioaReviewStatus: 'pending',
      wioaReviewedAt: null,
      wioaReviewedByUserId: null,
      wioaReviewNotes: null,
    },
  }));

  const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
    where: { id: user.id },
    select: { email: true, fullName: true },
  }));

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.workforceap.org');

  const emailSent = dbUser
    ? await sendWioaScreeningNotification({
        source: 'member_portal',
        contact: {
          fullName: dbUser.fullName || 'WorkforceAP member',
          email: dbUser.email,
        },
        snapshot,
        userId: user.id,
        adminUrl: `${siteUrl}/admin/members/${user.id}`,
      })
    : false;

  return NextResponse.json({ ok: true, snapshot, emailSent });

  } catch (error) {
    console.error('/member/wioa-qualification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);

