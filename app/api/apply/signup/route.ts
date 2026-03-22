import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { z } from 'zod';
import { checkSignupRateLimit } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

const applySignupSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name.').max(100),
  lastName: z.string().trim().min(1, 'Please enter your last name.').max(100),
  email: z.string().trim().email('Please enter a valid email address.'),
  phone: z.string().trim().min(10, 'Please enter a valid phone number with area code.').max(50),
  smsOptIn: z.boolean().optional().default(false),
  password: z.string().min(8, 'Create a password with at least 8 characters.'),
  programSlug: z.string().min(1, 'Please choose a program before creating your account.'),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { success: rateOk } = await checkSignupRateLimit(ip);
  if (!rateOk) {
    return NextResponse.json(
      { error: 'We received too many signup attempts from this connection. Please wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'We could not read your signup details. Please refresh the page and try again.' }, { status: 400 });
  }

  const parsed = applySignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Please review your information and try again.' }, { status: 400 });
  }

  const { firstName, lastName, email, phone, smsOptIn, password, programSlug } = parsed.data;

  const program = getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'We could not match that program choice. Please go back and choose your program again.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Our signup service is temporarily unavailable. Please try again shortly.' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, (options ?? {}) as Record<string, unknown>);
        });
      },
    },
  });

  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.toLowerCase().trim(),
    password,
    options: {
      data: { full_name: fullName, phone },
      emailRedirectTo: `${new URL(request.url).origin}/dashboard`,
    },
  });

  if (authError) {
    if (authError.message.includes('already registered') || authError.code === 'user_already_exists') {
      return NextResponse.json(
        { error: 'An account with this email already exists. Try logging in, or use password reset if you are returning.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'We could not create your account just yet. Please try again in a moment.' }, { status: 400 });
  }

  const user = authData.user;
  if (!user) {
    return NextResponse.json({ error: 'Your account could not be created. Please try again.' }, { status: 500 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          email: user.email!,
          fullName,
          phone,
          enrolledProgram: programSlug,
          enrolledAt: new Date(),
        },
        update: {},
      });

      await tx.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          profilePhone: phone,
          smsOptIn: smsOptIn ?? false,
        },
        update: {
          profilePhone: phone,
          smsOptIn: smsOptIn ?? false,
        },
      });
    });
  } catch (dbError) {
    console.error('Apply signup DB error:', dbError);
    return NextResponse.json({ error: 'Your account was started, but we could not finish saving it. Please try again, or contact us if this keeps happening.' }, { status: 500 });
  }

  if (authData.session) {
    return NextResponse.json({ success: true, redirectTo: '/dashboard' });
  }

  return NextResponse.json({
    success: true,
    message: 'Please verify your email, then log in to view your dashboard and next steps.',
    redirectTo: '/login',
  });
}
