import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { computeWioaSignal, parseWioaAnswers, type WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { sendWioaScreeningNotification } from '@/lib/wioa/wioaNotification';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { wioaQualificationJson: true },
  });

  return NextResponse.json({ snapshot: row?.wioaQualificationJson ?? null });
}

export async function POST(request: Request) {
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

  await prisma.user.update({
    where: { id: user.id },
    data: {
      wioaQualificationJson: snapshot as object,
      wioaReviewStatus: 'pending',
      wioaReviewedAt: null,
      wioaReviewedByUserId: null,
      wioaReviewNotes: null,
    },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, fullName: true },
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

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
}
