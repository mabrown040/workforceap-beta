import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { scoreAssessment, TOTAL_POINTS } from '@/lib/assessment/answer-key';
import type { QuestionChoice } from '@/lib/assessment/answer-key';
import { brandedEmailLayout } from '@/lib/email/template';
import { getAdminAlertRecipients } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { awardPoints } from '@/lib/member/points';
import { getCounselorStarterProfileReview, getStarterProfileFieldLabels } from '@/lib/member/starterProfileReview';

import { withApiGuc } from '@/lib/db/withRequestGuc';

export const POST = withApiGuc(async (request: Request) => {
  try {
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
  
    const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: {
        assessmentCompleted: true,
        email: true,
        phone: true,
        // Multi-program: counselor-created flag lives on the primary enrollment.
        courseEnrollments: {
          where: { isPrimary: true },
          select: { enrolledByAdminId: true },
          take: 1,
        },
        profile: {
          select: {
            profilePhone: true,
            profileAddress: true,
            city: true,
            state: true,
            zip: true,
            referralSource: true,
          },
        },
      },
    }));
  
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (dbUser.assessmentCompleted) {
      return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 });
    }

    const starterProfileReview = getCounselorStarterProfileReview({
      wasCounselorCreated: !!dbUser.courseEnrollments[0]?.enrolledByAdminId,
      phone: dbUser.phone,
      profilePhone: dbUser.profile?.profilePhone,
      profileAddress: dbUser.profile?.profileAddress,
      city: dbUser.profile?.city,
      state: dbUser.profile?.state,
      zip: dbUser.profile?.zip,
      referralSource: dbUser.profile?.referralSource,
    });
    if (starterProfileReview.required) {
      return NextResponse.json(
        {
          error: 'Review your profile details before starting the assessment.',
          code: 'STARTER_PROFILE_REVIEW_REQUIRED',
          missing: getStarterProfileFieldLabels(starterProfileReview.missing),
        },
        { status: 400 }
      );
    }

    // Use updateMany with assessmentCompleted=false in the WHERE clause so the
    // check and write are atomic — prevents a duplicate submission from a race
    // condition overwriting the first submission's answers.
    const updated = await prisma.$transaction((tx) => tx.user.updateMany({
      where: { id: user.id, assessmentCompleted: false },
      data: {
        assessmentCompleted: true,
        assessmentCompletedAt: new Date(),
        assessmentScore: raw,
        assessmentScorePct: pct,
        programInterest,
        assessmentAnswers: answersTyped as unknown as object,
      },
    }));
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Assessment already completed' }, { status: 400 });
    }
  
    awardPoints(user.id, 'assessment_completed').catch(() => {});
  
    // Track assessment completion for funnel analytics
    await trackEvent({
      userId: user.id,
      eventName: 'apply_signup_completed',
      entityType: 'assessment',
      metadata: { rawScore: raw, scorePct: pct, programInterest },
      sourcePage: '/dashboard/assessment',
    });
  
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.workforceap.org');
    const adminLink = `${siteUrl}/admin/assessments?userId=${user.id}`;
  
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';
    const dashboardUrl = `${siteUrl}/dashboard`;
  
    let memberEmailSent = false;
    let adminEmailSent = false;
    if (resendKey) {
      const resend = new Resend(resendKey);
  
      try {
        const result = await resend.emails.send({
          from: emailFrom,
          to: getAdminAlertRecipients(),
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
        if (result.error || !result.data?.id) {
          console.error('Assessment admin email was not accepted by the provider', {
            errorName: result.error?.name ?? 'missing_delivery_id',
          });
        } else {
          adminEmailSent = true;
        }
      } catch (err) {
        console.error('Assessment admin email failed:', err);
      }
  
      try {
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
        const result = await resend.emails.send({
          from: emailFrom,
          to: dbUser.email,
          subject: 'Assessment Complete — Workforce Advancement Project',
          html: memberHtml,
        });
        if (result.error || !result.data?.id) {
          console.error('Assessment member email was not accepted by the provider', {
            errorName: result.error?.name ?? 'missing_delivery_id',
          });
        } else {
          memberEmailSent = true;
        }
      } catch (err) {
        console.error('Assessment member email failed:', err);
      }
    }
  
    return NextResponse.json({
      ok: true,
      rawScore: raw,
      scorePct: pct,
      emailsSent: memberEmailSent,
      adminEmailSent,
    });
  } catch (error) {
    console.error('/member/assessment/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

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
