import { NextResponse } from 'next/server';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';

export async function POST(req: Request) {
  try {
    const { memberId, courseName, secret } = await req.json();
    
    // Basic auth check
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Trigger async workflow
    await handleLearningCompletion(memberId, courseName);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
