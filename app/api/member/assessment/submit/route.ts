import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { scoreAssessment, TOTAL_POINTS } from '@/lib/assessment/answer-key';
import type { QuestionChoice } from '@/lib/assessment/answer-key';
import { brandedEmailLayout } from '@/lib/email/template';

const ASSESSMENT_EMAIL_TO = 'info@workforceap.org';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid submission data' }, { status: 400 });
  }

  const { firstName, lastName, phone, programInterest, answers } = parsed;

  const answersTyped: Record<number, QuestionChoice> = {};
  for (const [k, v] of Object.entries(answers)) {
    const id = parseInt(k, 10);
    if (Number.isNaN(id) || !['A', 'B', 'C', 'D'].includes(v as string)) continue;
    answersTyped[id] = v as QuestionChoice;
  }

  const { raw, pct } = scoreAssessment(answersTyped);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { assessmentCompleted: true, email: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  if (dbUser.assessmentCompleted) {
    return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      assessmentCompleted: true,
      assessmentCompletedAt: new Date(),
      assessmentScore: raw,
      assessmentScorePct: pct,
      programInterest,
      assessmentAnswers: answersTyped as unknown as object,
    },
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const adminLink = `${siteUrl}/admin/assessments?userId=${user.id}`;

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
  const dashboardUrl = `${siteUrl}/dashboard`;

  let memberEmailSent = false;
  if (resendKey) {
    try {
      const resend = new Resend(resendKey);

      // Admin notification (plain text)
      await resend.emails.send({
        from: emailFrom,
        to: ASSESSMENT_EMAIL_TO,
        subject: `New Assessment Submitted — ${firstName} ${lastName}`,
        text: [
          `Name: ${firstName} ${lastName}`,
          `Email: ${dbUser.email}`,
          `Phone: ${phone}`,
          `Program Interest: ${programInterest}`,
          `Score: ${raw}/${TOTAL_POINTS} (${pct}%)`,
          `Submitted: ${new Date().toISOString()}`,
          '',
          `View full results: ${adminLink}`,
        ].join('\n'),
      });

      // Member: branded assessment complete notification
      const memberHtml = brandedEmailLayout({
        title: 'Assessment Complete',
        bodyHtml: `
          <p>Hi ${firstName},</p>
          <p>You've completed your readiness assessment. Your score: <strong>${raw}/${TOTAL_POINTS} (${pct}%)</strong>.</p>
          <p>You're all set to continue to your training. Log in to your dashboard to access your Coursera courses.</p>
        `,
        ctaText: 'Go to Dashboard',
        ctaUrl: dashboardUrl,
      });
      await resend.emails.send({
        from: emailFrom,
        to: dbUser.email,
        subject: 'Assessment Complete — Workforce Advancement Project',
        html: memberHtml,
      });
      memberEmailSent = true;
    } catch (err) {
      console.error('Assessment email failed:', err);
    }
  }

  return NextResponse.json({
    ok: true,
    rawScore: raw,
    scorePct: pct,
    emailsSent: memberEmailSent,
  });
}

function parseBody(body: unknown): {
  firstName: string;
  lastName: string;
  phone: string;
  programInterest: string;
  answers: Record<string, string>;
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.firstName !== 'string' || !o.firstName.trim()) return null;
  if (typeof o.lastName !== 'string' || !o.lastName.trim()) return null;
  if (typeof o.phone !== 'string' || !o.phone.trim()) return null;
  if (typeof o.programInterest !== 'string' || !o.programInterest.trim()) return null;
  if (!o.answers || typeof o.answers !== 'object') return null;
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(o.answers)) {
    if (typeof v === 'string') answers[k] = v;
  }
  return {
    firstName: o.firstName.trim(),
    lastName: o.lastName.trim(),
    phone: o.phone.trim(),
    programInterest: o.programInterest.trim(),
    answers,
  };
}
