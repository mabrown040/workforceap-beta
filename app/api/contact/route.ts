import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { checkContactRateLimit } from '@/lib/rate-limit';

const CONTACT_EMAIL_TO = 'info@workforceap.org';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkContactRateLimit(ip);
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
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { firstName, lastName, email, phone, topic, message, smsPreferred } = parsed;

  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@workforceap.org';

  if (!resendKey) {
    console.error('RESEND_API_KEY not configured');
    return NextResponse.json(
      { error: 'Email service is not configured. Please try again later.' },
      { status: 503 }
    );
  }

  const subject = `Contact Form: ${topic} — ${firstName} ${lastName}`;
  const text = [
    `From: ${firstName} ${lastName}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Prefer text: ${smsPreferred ? 'Yes' : 'No'}`,
    `Topic: ${topic}`,
    '',
    'Message:',
    message,
    '',
    `Submitted: ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: emailFrom,
      to: CONTACT_EMAIL_TO,
      replyTo: email,
      subject,
      text,
    });
  } catch (err) {
    console.error('Contact form email failed:', err);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again later.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

function parseBody(body: unknown): {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
  smsPreferred?: boolean;
} | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const firstName = typeof o.first_name === 'string' ? o.first_name.trim() : null;
  const lastName = typeof o.last_name === 'string' ? o.last_name.trim() : null;
  const email = typeof o.email === 'string' ? o.email.trim() : null;
  const phone = typeof o.phone === 'string' ? o.phone.trim() || undefined : undefined;
  const topic = typeof o.topic === 'string' ? o.topic.trim() : null;
  const message = typeof o.message === 'string' ? o.message.trim() : null;
  const smsPreferred = o.sms_preferred === true || o.sms_preferred === 'true';
  if (!firstName || !lastName || !email || !topic || !message) return null;
  return { firstName, lastName, email, phone, topic, message, smsPreferred };
}
