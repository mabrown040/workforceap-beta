import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import { checkAuthRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  let body: { email?: string; password?: string; redirectTo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const redirectTo = sanitizeRedirectPath(
    typeof body?.redirectTo === 'string' ? body.redirectTo : undefined,
    '/dashboard'
  );

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  // Rate limit by email to prevent brute-force
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;
  const { success: withinLimit } = await checkAuthRateLimit(rateLimitKey);
  if (!withinLimit) {
    return NextResponse.json(
      {
        error:
          'Too many login attempts from this network. Please wait a minute before trying again, or reset your password if you are locked out.',
      },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (!data.session) {
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 401 });
  }

  return NextResponse.redirect(new URL(redirectTo, request.url), 302);
}
