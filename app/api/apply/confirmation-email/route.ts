import { NextRequest, NextResponse } from 'next/server';
import { sendApplicationConfirmationEmail } from '@/lib/email';
import { checkConfirmationEmailRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown';

    const { success } = await checkConfirmationEmailRateLimit(ip);
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

    const result = await sendApplicationConfirmationEmail({
      to: parsed.data.email,
      fullName: parsed.data.fullName,
    });
    return NextResponse.json({ ok: result.ok });
  } catch (err) {
    console.error('[apply-confirmation-email] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
