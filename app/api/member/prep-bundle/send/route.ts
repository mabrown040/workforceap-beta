import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { fetchInterviewPrepBundle } from '@/lib/member/interviewPrepBundle';
import { sendInterviewPrepBundleEmail } from '@/lib/email';
import { checkContactRateLimit } from '@/lib/rate-limit';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * POST /api/member/prep-bundle/send
 * Body: { selectedToolTypes?: string[] }
 * Sends selected AI tool results as a pre-interview prep bundle email to the
 * authenticated member's own address only. memberEmail is intentionally ignored
 * to prevent use as an open email relay.
 */
export const POST = withApiGuc(async (request: NextRequest) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const { success: withinLimit } = await checkContactRateLimit(ip);
  if (!withinLimit) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { selectedToolTypes?: string[] } = {};
  try { body = await request.json(); } catch { /* no body ok */ }

  const bundle = await fetchInterviewPrepBundle(user.id);
  if (bundle.empty) {
    return NextResponse.json(
      { error: 'No AI tool results yet. Run a few tools first, then come back.' },
      { status: 400 }
    );
  }

  // Filter to selected items if provided
  const selectedTypes = body.selectedToolTypes;
  const itemsToSend = selectedTypes && selectedTypes.length > 0
    ? bundle.items.filter(i => selectedTypes.includes(i.toolType))
    : bundle.items;

  if (itemsToSend.length === 0) {
    return NextResponse.json({ error: 'No items selected to send.' }, { status: 400 });
  }

  const email = user.email || '';
  if (!email) {
    return NextResponse.json({ error: 'No email address available.' }, { status: 400 });
  }

  const result = await sendInterviewPrepBundleEmail({
    to: email,
    memberName: (user.user_metadata?.full_name as string) || user.email || 'Member',
    bundle: {
      items: itemsToSend,
      generatedAt: new Date(),
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Email failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, sentTo: email, itemCount: itemsToSend.length });

  } catch (error) {
    console.error('/member/prep-bundle/send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
