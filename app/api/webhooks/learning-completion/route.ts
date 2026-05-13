import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';

export async function POST(req: Request) {
  try {
    const { memberId, courseName } = await req.json();

    const providedSecret = req.headers.get('x-webhook-secret') || '';
    const expectedSecret = process.env.WEBHOOK_SECRET || '';
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
