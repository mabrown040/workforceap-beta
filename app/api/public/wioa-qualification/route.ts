import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computeWioaSignal, parseWioaAnswers, type WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { sendWioaScreeningNotification } from '@/lib/wioa/wioaNotification';

const publicLeadSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name').max(120),
  email: z.string().trim().email('Please enter a valid email').max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const contact = publicLeadSchema.safeParse((body as Record<string, unknown> | null)?.contact ?? null);
  if (!contact.success) {
    return NextResponse.json({ error: contact.error.errors[0]?.message ?? 'Invalid contact info' }, { status: 400 });
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

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.workforceap.org');

  const emailSent = await sendWioaScreeningNotification({
    source: 'public_page',
    contact: {
      fullName: contact.data.fullName,
      email: contact.data.email,
      phone: contact.data.phone || null,
    },
    snapshot,
    adminUrl: `${siteUrl}/admin/wioa-screening`,
  });

  return NextResponse.json({ ok: true, snapshot, emailSent });
}
