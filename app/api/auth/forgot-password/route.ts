import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';

export async function POST(request: Request) {
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
