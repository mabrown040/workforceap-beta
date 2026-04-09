import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  let body: { email?: string; password?: string; redirectTo?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const rememberMe = body?.rememberMe !== false; // defaults to true
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

  // Use conditional maxAge: 7 days if rememberMe, session-only otherwise
  const cookieStore = await cookies();
  const baseOpts = getSupabaseCookieOptions();
  const cookieMaxAge = rememberMe ? baseOpts.maxAge : undefined; // undefined = session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { ...baseOpts, maxAge: cookieMaxAge },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = (options ?? {}) as Parameters<typeof cookieStore.set>[2];
            cookieStore.set(name, value, { ...opts, maxAge: cookieMaxAge });
          });
        },
      },
    }
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (!data.session) {
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: data.user.id },
    select: { role: true },
  });

  const roleAwareRedirect =
    profile?.role === 'super_admin'
      ? '/admin'
      : redirectTo === '/dashboard' && profile?.role === 'admin'
        ? '/admin'
        : redirectTo;

  return NextResponse.redirect(new URL(roleAwareRedirect, request.url), 302);
}
