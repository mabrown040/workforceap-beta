import { NextRequest, NextResponse } from 'next/server';
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[interview-voice] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
