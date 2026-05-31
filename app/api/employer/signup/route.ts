import { createEmployerUser } from '@/lib/employer/service';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { employerSignupSchema } from '@/lib/validation/employer';
import { checkPartnerSignupRateLimit, checkSignupEmailRateLimit } from '@/lib/rate-limit';
import { sendEmployerWelcomeEmail, sendEmployerSignupAdminAlertEmail } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function cleanupCreatedEmployerSignupAuthUser(
  admin: ReturnType<typeof getSupabaseAdmin>,
  userId: string
): Promise<void> {
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('Employer signup auth cleanup failed:', error);
    }
  } catch (cleanupError) {
    console.error('Employer signup auth cleanup failed:', cleanupError);
  }
}

export async function POST(request: NextRequest) {
  try {
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
          : messages.slice(0, 6).join(' · ');
      return NextResponse.json({ error }, { status: 400 });
    }

    const data = parsed.data;

    // Per-email rate limit (3/hr) — caps target-mail spam from IP-rotators.
    const { success: emailRateOk } = await checkSignupEmailRateLimit(data.email);
    if (!emailRateOk) {
      return NextResponse.json(
        { error: 'Too many signup attempts for this email. Please try again later.' },
        { status: 429 }
      );
    }

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

    // Use admin client to create a confirmed user so we can auto-login
    const admin = getSupabaseAdmin();
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.contactName,
        phone: data.phone,
      },
    });

    if (createError) {
      if (
        createError.message.includes('already registered') ||
        createError.message.includes('already exists') ||
        createError.message.includes('User already registered')
      ) {
        return NextResponse.json(
          { error: 'An account with this email may already exist. Try logging in or resetting your password.' },
          { status: 400 }
        );
      }
      if (
        createError.message.toLowerCase().includes('rate limit') ||
        createError.message.toLowerCase().includes('email rate limit')
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

    const user = createData.user;
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
      await cleanupCreatedEmployerSignupAuthUser(admin, user.id);
      return NextResponse.json(
        { error: 'Account creation failed. Please try again.' },
        { status: 500 }
      );
    }

    // Auto-login: create a session and set cookies
    const cookieStore = await cookies();
    const cookieOpts = getSupabaseCookieOptions(false); // rememberMe = true for employer signup

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookieOptions: cookieOpts,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = options as { path?: string; maxAge?: number; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; httpOnly?: boolean } | undefined;
            cookieStore.set(name, value, opts ?? {});
          });
        },
      },
    });

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError || !signInData.session) {
      console.error('Employer auto-login failed:', signInError);
      // Clean up orphaned auth user since employer profile was not fully created
      await cleanupCreatedEmployerSignupAuthUser(admin, user.id);
      // Fallback: return success without session, ask them to log in
      return NextResponse.json({
        success: true,
        message: 'Account created. Please log in to continue.',
      });
    }

    // Best-effort welcome email
    sendEmployerWelcomeEmail({
      to: data.email,
      companyName: data.companyName,
      contactName: data.contactName,
    }).catch((err) => console.error('Employer welcome email failed:', err));

    // Best-effort admin alert
    sendEmployerSignupAdminAlertEmail({
      companyName: data.companyName,
      contactName: data.contactName,
      contactEmail: data.email,
      contactPhone: data.phone,
    }).catch((err) => console.error('Employer admin alert failed:', err));

    return NextResponse.json({
      success: true,
      redirectTo: '/employer',
    });
  } catch (error) {
    console.error('/employer/signup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
