import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { checkWebhookRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';

export async function POST(req: Request) {
  try {
    const ip = getClientIpFromRequest(req);
    const { success: withinLimit } = await checkWebhookRateLimit(ip);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const { memberId, courseName } = await req.json();

    // Refuse to authenticate if the server-side secret is not configured.
    // Without this guard, an unset/empty WEBHOOK_SECRET would let any caller
    // omit the header and pass timingSafeEqual('', '') as true — silent
    // bypass on misconfigured preview/staging/prod envs.
    const expectedSecret = process.env.WEBHOOK_SECRET || '';
    if (!expectedSecret) {
      console.error('[webhooks/learning-completion] WEBHOOK_SECRET is not configured — refusing all requests');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const providedSecret = req.headers.get('x-webhook-secret') || '';
    if (providedSecret.length !== expectedSecret.length) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const expected = Buffer.from(expectedSecret);
    const actual = Buffer.from(providedSecret);
    if (!timingSafeEqual(actual, expected)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (typeof memberId !== 'string' || typeof courseName !== 'string' || !memberId.trim() || !courseName.trim()) {
      return NextResponse.json({ error: 'memberId and courseName are required' }, { status: 400 });
    }

    const result = await handleLearningCompletion(memberId.trim(), courseName.trim());

    return NextResponse.json({
      success: true,
      actionId: result.actionId,
      created: result.created,
      duplicatedRecentAction: result.duplicatedRecentAction,
      matchedJobId: result.matchedJobId,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
