import { createEmployerUser } from '@/lib/employer/service';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { employerSignupSchema } from '@/lib/validation/employer';
import { checkPartnerSignupRateLimit } from '@/lib/rate-limit';
import { sendEmployerWelcomeEmail } from '@/lib/email';

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
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = employerSignupSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.errors.map((e) => e.message).filter(Boolean);
    const error =
      messages.length <= 1
        ? (messages[0] ?? 'Validation failed')
        : messages.slice(0, 6).join(' \u00b7 ');
    return NextResponse.json({ error }, { status: 400 });
  }

  const data = parsed.data;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const databaseUrl =
    process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      {
        error:
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings.',
      },
      { status: 500 }
    );
  }

  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          'Database is not configured. Add POSTGRES_PRISMA_URL in your Vercel project settings.',
      },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // Route handler - cookies set by middleware on redirect
      },
    },
  });

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.contactName,
        phone: data.phone,
      },
      emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
    },
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.code === 'user_already_exists') {
      return NextResponse.json(
        { error: 'An account with this email may already exist. Try logging in or resetting your password.' },
        { status: 400 }
      );
    }
    if (
      authError.message.toLowerCase().includes('rate limit') ||
      authError.message.toLowerCase().includes('email rate limit') ||
      authError.code === 'over_email_send_limit'
    ) {
      return NextResponse.json(
        {
          error:
            'Too many signup emails sent. Please try again in an hour, or use a different email.',
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'We could not create your account. Please try again or contact us at (512) 777-1808.' },
      { status: 400 }
    );
  }

  const user = authData.user;
  if (!user) {
    return NextResponse.json(
      { error: 'Account creation failed. Please try again.' },
      { status: 500 }
    );
  }

  try {
    await createEmployerUser(user.id, data);
  } catch (err) {
    console.error('Employer signup creation error:', err);
    return NextResponse.json(
      { error: 'Account creation failed. Please try again.' },
      { status: 500 }
    );
  }

  // Best-effort welcome email
  sendEmployerWelcomeEmail({
    to: data.email,
    companyName: data.companyName,
    contactName: data.contactName,
  }).catch((err) => console.error('Employer welcome email failed:', err));

  return NextResponse.json({
    success: true,
    message: 'Check your email to verify your account.',
  });
}
