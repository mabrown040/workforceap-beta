import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Resend } from 'resend';
import { prisma } from '@/lib/db/prisma';
import { checkPartnerSignupRateLimit } from '@/lib/rate-limit';
import { sanitizeEmailSubjectLine } from '@/lib/email/escapeHtml';

const TO_EMAIL = 'info@workforceap.org';

const signupSchema = z.object({
  organizationName: z.string().min(1).max(200).trim(),
  contactName: z.string().min(1).max(200).trim(),
  contactEmail: z.string().email().max(320).toLowerCase().trim(),
  contactPhone: z.string().max(50).optional().nullable(),
  orgType: z.string().min(1).max(120).trim(),
  serveArea: z.string().min(1).max(200).trim(),
  expectedMonthly: z.string().min(1).max(40).trim(),
  hearAbout: z.string().max(2000).optional().nullable(),
});

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkPartnerSignupRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again in an hour.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const phone = d.contactPhone?.trim() || null;
  const hear = d.hearAbout?.trim() || null;

  await prisma.partnerSignupRequest.create({
    data: {
      organizationName: d.organizationName,
      contactName: d.contactName,
      contactEmail: d.contactEmail,
      contactPhone: phone,
      orgType: d.orgType,
      expectedMonthly: d.expectedMonthly,
      serveArea: d.serveArea,
      hearAbout: hear,
    },
  });

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';

  if (resendKey) {
    const text = [
      'New partner organization registration',
      '',
      `Organization: ${d.organizationName}`,
      `Contact: ${d.contactName}`,
      `Email: ${d.contactEmail}`,
      `Phone: ${phone ?? '—'}`,
      `Organization type: ${d.orgType}`,
      `City / county served: ${d.serveArea}`,
      `Estimated monthly referrals: ${d.expectedMonthly}`,
      hear ? `How they heard about WorkforceAP: ${hear}` : '',
      '',
      `Submitted: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: emailFrom,
        to: TO_EMAIL,
        replyTo: d.contactEmail,
        subject: sanitizeEmailSubjectLine(`Partner signup: ${d.organizationName}`),
        text,
      });
    } catch (e) {
      console.error('Partner signup email failed:', e);
    }
  }

  return NextResponse.json({
    ok: true,
    message:
      "Thank you! We'll review your registration and set up your partner portal within 1–2 business days.",
  });
}
