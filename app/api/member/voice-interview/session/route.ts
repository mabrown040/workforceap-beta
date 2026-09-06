import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/auth/server';
import { hasActiveVoiceSessionUser, VOICE_SESSION_IDENTITY_MESSAGE, VOICE_SESSION_RESPONSE_HEADERS, VOICE_SESSION_UNAVAILABLE_MESSAGE } from '@/lib/ai/voiceSessionBoundary';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { aiResponseLanguageInstruction, normalizeAIResponseLanguage } from '@/lib/ai/responseLanguage';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const payloadSchema = z.object({
  role: z.string().trim().max(200).optional(),
  interviewType: z.string().trim().toLowerCase().pipe(z.enum(['behavioral', 'technical', 'general'])).optional(),
  experienceLevel: z.enum(['entry', 'mid', 'senior']).optional(),
  language: z.enum(['en', 'es', 'fr', 'pt']).optional(),
});

/** POST — signed URL for voice mock interview with role / style context. */
export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await hasActiveVoiceSessionUser(user.id))) {
      return NextResponse.json({ error: VOICE_SESSION_IDENTITY_MESSAGE }, { status: 403 });
    }
    const { success: voiceRateOk } = await checkVoiceSessionRateLimit(user.id);
    if (!voiceRateOk) {
      return NextResponse.json(
        { error: VOICE_SESSION_LIMIT_MESSAGE },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }
  
    const parsed = payloadSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid interview coaching request.' }, { status: 400 });
    }
    const body = parsed.data;
    const role = body.role || 'the candidate';
    const interviewType = body.interviewType || 'behavioral';
    const experienceLevel = body.experienceLevel || 'entry';
    const language = normalizeAIResponseLanguage(body.language);
  
    const member = await fetchMemberPortalDynamicVariables(user.id);
    const dynamicVariables = {
      ...member,
      target_role: role,
      interview_type: interviewType,
      experience_level: experienceLevel,
      response_language: language,
      response_language_instruction: aiResponseLanguageInstruction(language),
    };
  
    try {
      const { signedUrl, expiresAt, dynamicVariables: safeVars } = await startElevenLabsPortalSession('interview', {
        dynamicVariables,
      });
      return NextResponse.json({
        signedUrl,
        expiresAt,
        dynamicVariables: safeVars,
      }, { headers: VOICE_SESSION_RESPONSE_HEADERS });
    } catch (e) {
      console.error('[member/voice-interview/session]', e);
      return NextResponse.json({ error: VOICE_SESSION_UNAVAILABLE_MESSAGE }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/voice-interview/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
