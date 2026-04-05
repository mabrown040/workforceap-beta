import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  computeWioaSignal,
  parseWioaAnswers,
  type WioaQualificationSnapshot,
} from '@/lib/wioa/wioaQualification';

const NOTIFY_EMAIL = process.env.WIOA_SCREENING_NOTIFY_EMAIL ?? 'info@workforceap.org';

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
    data: { wioaQualificationJson: snapshot as object },
  });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, fullName: true },
  });

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
  let emailSent = false;

  if (resendKey && dbUser) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: emailFrom,
        to: NOTIFY_EMAIL,
        subject: `WIOA self-screening — ${dbUser.fullName}`,
        text: [
          `Member: ${dbUser.fullName}`,
          `Email: ${dbUser.email}`,
          `User ID: ${user.id}`,
          `Signal (heuristic): ${signal}`,
          `Location (self-reported): ${answers.countyOrZip || '(not provided)'}`,
          `Submitted: ${snapshot.submittedAt}`,
          '',
          'Reasons shown to member:',
          ...reasons.map((r) => `• ${r}`),
          '',
          `Admin: ${siteUrl}/admin/members/${user.id}`,
        ].join('\n'),
      });
      emailSent = true;
    } catch (err) {
      console.error('[wioa-qualification] email failed:', err);
    }
  }

  return NextResponse.json({ ok: true, snapshot, emailSent });
}
