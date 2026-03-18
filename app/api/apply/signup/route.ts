import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { z } from 'zod';

const applySignupSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(50),
  password: z.string().min(8),
  programSlug: z.string().min(1),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = applySignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' }, { status: 400 });
  }

  const { firstName, lastName, email, phone, password, programSlug } = parsed.data;

  const program = getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
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
        { error: 'An account with this email already exists. Try logging in.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const user = authData.user;
  if (!user) {
    return NextResponse.json({ error: 'Account creation failed' }, { status: 500 });
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
        },
        update: {},
      });
    });
  } catch (dbError) {
    console.error('Apply signup DB error:', dbError);
    return NextResponse.json({ error: 'Account creation failed. Please try again.' }, { status: 500 });
  }

  if (authData.session) {
    return NextResponse.json({ success: true, redirectTo: '/dashboard' });
  }

  return NextResponse.json({
    success: true,
    message: 'Check your email to verify your account, then log in.',
    redirectTo: '/login',
  });
}
