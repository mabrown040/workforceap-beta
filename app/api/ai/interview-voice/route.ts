import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit, checkAICoachUserRateLimit, checkAICoachIpRateLimit } from '@/lib/rate-limit';
import { generateSpeech } from '@/lib/ai/elevenlabs';
import { getClientIp } from '@/lib/api-utils';
import { createApiErrorResponse, createRateLimitResponse, createServiceUnavailableResponse, createUnauthorizedResponse } from '@/lib/api-utils';

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
      return createUnauthorizedResponse();
    }

    const { success: withinLimit } = await checkAIToolRateLimit(user.id);
    const ip = getClientIp(req);
    const userLimit = await checkAICoachUserRateLimit(user.id);
    const ipLimit = await checkAICoachIpRateLimit(ip);
    if (!userLimit.success || !ipLimit.success) return createRateLimitResponse();
    if (!withinLimit) {
      return createRateLimitResponse();
    }

    const body = await req.json();
    const { text, voiceId } = body as { text: string; voiceId?: string };

    if (!text || typeof text !== 'string' || text.length > 2000) {
      return createApiErrorResponse('Text is required and must be under 2000 characters', 'VALIDATION_ERROR', 400);
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return createServiceUnavailableResponse('ElevenLabs API key not configured');
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
    return createApiErrorResponse('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
