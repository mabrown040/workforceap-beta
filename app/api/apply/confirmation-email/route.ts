import { NextRequest, NextResponse } from 'next/server';
import { sendApplicationConfirmationEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
});

export async function POST(request: NextRequest) {
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
}
