import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { checkForgotPasswordRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';

export async function POST(request: Request) {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkForgotPasswordRateLimit(ip);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many reset requests. Please try again in an hour.' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.workforceap.org';
  const redirectTo = `${baseUrl}/login?reset=success`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  // Uniform response — avoids revealing whether the email is registered
  if (error && process.env.NODE_ENV === 'development') {
    console.warn('[forgot-password]', error.message);
  }

  return NextResponse.json({
    success: true,
    message: 'If an account exists for that email, you will receive reset instructions shortly.',
  });
}
