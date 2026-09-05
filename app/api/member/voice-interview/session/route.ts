import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit } from '@/lib/rate-limit';
import { startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { aiResponseLanguageInstruction, normalizeAIResponseLanguage } from '@/lib/ai/responseLanguage';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/** POST — signed URL for voice mock interview with role / style context. */
export const POST = withApiGuc(async (req: NextRequest) => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { success: voiceRateOk } = await checkVoiceSessionRateLimit(user.id);
    if (!voiceRateOk) {
      return NextResponse.json(
        { error: VOICE_SESSION_LIMIT_MESSAGE },
        { status: 429, headers: { 'Retry-After': '3600' } }
      );
    }
  
    let body: { role?: string; interviewType?: string; experienceLevel?: string; language?: string } = {};
    try {
      body = (await req.json()) as { role?: string; interviewType?: string; experienceLevel?: string; language?: string };
    } catch {
      /* empty body */
    }
  
    const role = body.role?.trim() || 'the candidate';
    const interviewType = body.interviewType?.trim() || 'Behavioral';
    const experienceLevel = body.experienceLevel?.trim() || 'entry';
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
      });
    } catch (e) {
      console.error('[member/voice-interview/session]', e);
      const raw = e instanceof Error ? e.message : 'Failed to start session';
      const publicMsg =
        /ELEVENLABS_API_KEY|not set|xi-api-key/i.test(raw) || /No ElevenLabs agent ID/i.test(raw)
          ? 'Voice coaching is temporarily unavailable. Please try again later.'
          : raw.length > 280
            ? `${raw.slice(0, 280)}…`
            : raw;
      return NextResponse.json({ error: publicMsg }, { status: 503 });
    }
  } catch (error) {
    console.error('/member/voice-interview/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
