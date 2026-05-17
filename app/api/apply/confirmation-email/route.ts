import { NextRequest, NextResponse } from 'next/server';
import { sendApplicationConfirmationEmail } from '@/lib/email';
import {
  checkConfirmationEmailRateLimit,
  checkConfirmationEmailEmailRateLimit,
} from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
});

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-vercel-forwarded-for') ??
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const { success } = await checkConfirmationEmailRateLimit(getClientIp(request));
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Block IP-rotating spray against a target inbox. Without this, the
    // per-IP cap alone lets a botnet send our branded confirmation email
    // to any attacker-chosen address — domain abuse for phishing pretext.
    const { success: emailWithinLimit } = await checkConfirmationEmailEmailRateLimit(parsed.data.email);
    if (!emailWithinLimit) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const result = await sendApplicationConfirmationEmail({
      to: parsed.data.email,
      fullName: parsed.data.fullName,
    });
    return NextResponse.json({ ok: result.ok });
  } catch (err) {
    console.error('[app/api/apply/confirmation-email] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
