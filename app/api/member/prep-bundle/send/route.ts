import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { fetchInterviewPrepBundle } from '@/lib/member/interviewPrepBundle';
import { sendInterviewPrepBundleEmail } from '@/lib/email';

/**
 * POST /api/member/prep-bundle/send
 * Body: { memberEmail?: string }
 * Sends the member's AI tool results as a pre-interview prep bundle email.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { memberEmail?: string } = {};
  try { body = await request.json(); } catch { /* no body ok */ }

  const bundle = await fetchInterviewPrepBundle(user.id);
  if (bundle.empty) {
    return NextResponse.json(
      { error: 'No AI tool results yet. Run a few tools first, then come back.' },
      { status: 400 }
    );
  }

  const email = body.memberEmail?.trim() || user.email || '';
  if (!email) {
    return NextResponse.json({ error: 'No email address available.' }, { status: 400 });
  }

  const result = await sendInterviewPrepBundleEmail({
    to: email,
    memberName: (user.user_metadata?.full_name as string) || user.email || 'Member',
    bundle,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Email failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: email, itemCount: bundle.items.length });
}

/**
 * GET /api/member/prep-bundle
 * Returns the bundle data for display (no email sent).
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bundle = await fetchInterviewPrepBundle(user.id);
  return NextResponse.json({
    items: bundle.items.map(i => ({
      toolType: i.toolType,
      title: i.title,
      content: i.content,
      createdAt: i.createdAt.toISOString(),
    })),
    generatedAt: bundle.generatedAt.toISOString(),
    empty: bundle.empty,
  });
}
