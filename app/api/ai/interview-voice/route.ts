import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { generateSpeech } from '@/lib/ai/elevenlabs';

/**
 * POST /api/ai/interview-voice
 *
 * Generate AI interviewer voice audio using ElevenLabs.
 * Used by the Interview Simulator for text-to-speech.
 *
 * Body: { text: string, voiceId?: string }
 * Returns: audio/mpeg stream
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success: withinLimit } = await checkAIToolRateLimit(user.id);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { text, voiceId } = body as { text: string; voiceId?: string };

    if (!text || typeof text !== 'string' || text.length > 2000) {
      return NextResponse.json(
        { error: 'Text is required and must be under 2000 characters' },
        { status: 400 }
      );
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 503 }
      );
    }

    const audioBuffer = await generateSpeech(text, { voiceId });

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[interview-voice] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
