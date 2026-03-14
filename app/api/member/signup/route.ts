import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { memberSignupSchema } from '@/lib/validation/member';
import { checkSignupRateLimit } from '@/lib/rate-limit';
import { ApplicationStatus } from '@prisma/client';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const { success: rateOk } = await checkSignupRateLimit(ip);
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

  const parsed = memberSignupSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json(
      { error: first?.message ?? 'Validation failed' },
      { status: 400 }
    );
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
          'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings (from Supabase Dashboard → Project Settings → API).',
      },
      { status: 500 }
    );
  }

  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          'Database is not configured. The Supabase integration should add POSTGRES_PRISMA_URL. If missing, add it in Vercel (from Supabase Dashboard → Project Settings → Database).',
      },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
        full_name: data.fullName,
        phone: data.phone,
      },
      emailRedirectTo: `${request.nextUrl.origin}/login`,
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
            'Too many signup emails sent. Please try again in an hour, or use a different email. For testing, you can disable "Confirm email" in Supabase Dashboard → Auth → Providers → Email.',
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: authError.message },
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
    await prisma.$transaction(async (tx) => {
      let memberRole = await tx.role.findUnique({ where: { name: 'member' } });
      if (!memberRole) {
        memberRole = await tx.role.create({ data: { name: 'member' } });
      }

      await tx.user.create({
        data: {
          id: user.id,
          email: data.email,
          fullName: data.fullName,
          phone: data.phone,
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: memberRole.id },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          zip: data.zip,
          veteranStatus: data.veteranStatus ?? undefined,
          employmentStatus: data.employmentStatus ?? undefined,
          consentTerms: data.consentTerms,
          consentCommunications: data.consentCommunications ?? false,
        },
      });

      await tx.application.create({
        data: {
          userId: user.id,
          status: ApplicationStatus.PENDING,
          programInterest: data.programInterest,
          submittedAt: new Date(),
        },
      });
    });
  } catch (dbError) {
    console.error('Signup DB error:', dbError);
    return NextResponse.json(
      { error: 'Account creation failed. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Check your email to verify your account.',
  });
}
