import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { VOICE_SESSION_LIMIT_MESSAGE, checkVoiceSessionRateLimit, checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion } from '@/lib/ai/groq';
import { cleanSpokenLine } from '@/lib/ai/postProcess';
import { getElevenLabsAgentId, startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';
import { appendCoachMemoryToSystemPrompt, loadCoachMemory } from '@/lib/coach/memory';
import { aiResponseLanguageInstruction, firstInterviewPromptForLanguage, nextInterviewPromptForLanguage, normalizeAIResponseLanguage } from '@/lib/ai/responseLanguage';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * POST /api/interview/session
 *
 * Two modes:
 * 1. ElevenLabs voice: returns a signed conversation URL when ELEVENLABS_API_KEY is set
 * 2. Groq text fallback: returns the first AI question as plain text
 */
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
    const { success: aiRateOk } = await checkAIToolRateLimit(user.id);
    if (!aiRateOk) return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });

    const body = await req.json() as {
      role: string;
      interviewType: string;
      transcript?: { question: string; answer: string }[];
      nextQuestion?: boolean;
      forceText?: boolean;
      language?: string;
    };
    const { role, interviewType, transcript, nextQuestion, forceText } = body;
    const language = normalizeAIResponseLanguage(body.language);
  
    if (!role || !interviewType) {
      return NextResponse.json({ error: 'role and interviewType are required' }, { status: 400 });
    }
  
    // ── Mode 1: ElevenLabs Conversational AI ──────────────────────────────────
    if (ELEVENLABS_API_KEY && !nextQuestion && !forceText) {
      try {
        const member = await fetchMemberPortalDynamicVariables(user.id);
        const dynamicVariables = {
          ...member,
          target_role: role,
          interview_type: interviewType,
          response_language: language,
          response_language_instruction: aiResponseLanguageInstruction(language),
        };
        const { signedUrl, dynamicVariables: returnedVars } = await startElevenLabsPortalSession('interview', {
          dynamicVariables,
        });
        const agentId = getElevenLabsAgentId('interview') ?? '';
        return NextResponse.json({
          mode: 'voice',
          signedUrl,
          agentId,
          role,
          interviewType,
          dynamicVariables: returnedVars ?? dynamicVariables,
          sessionId: `${user.id}-${Date.now()}`,
        });
      } catch (err) {
        console.error('ElevenLabs signed URL error:', err);
        // Fall through to text mode
      }
    }
  
    // ── Mode 2: Groq text fallback ────────────────────────────────────────────
    const [memberContext, memorySummary] = await Promise.all([
      fetchMemberPortalDynamicVariables(user.id),
      loadCoachMemory(user.id),
    ]);
    const baseSystemPrompt = `You are a professional job interviewer conducting a ${interviewType} interview for a ${role} position. ${aiResponseLanguageInstruction(language)} Ask one realistic interview question at a time. Be concise and direct. Do not add preamble or commentary — just the question.`;
    const systemPrompt = appendCoachMemoryToSystemPrompt(
      baseSystemPrompt,
      memorySummary ?? memberContext.coach_memory_summary
    );
  
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
    ];
  
    if (nextQuestion && transcript?.length) {
      for (const entry of transcript) {
        messages.push({ role: 'assistant', content: entry.question });
        messages.push({ role: 'user', content: entry.answer });
      }
      messages.push({ role: 'user', content: nextInterviewPromptForLanguage(language) });
    } else {
      messages.push({ role: 'user', content: firstInterviewPromptForLanguage(language) });
    }
  
    const question = await chatCompletion(messages, { maxTokens: 200 });
    const firstQuestion = cleanSpokenLine(
      question ?? `Tell me about yourself and why you are interested in the ${role} role.`
    );
  
    return NextResponse.json({
      mode: 'text',
      firstQuestion,
      role,
      interviewType,
      sessionId: `${user.id}-${Date.now()}`,
    });
  } catch (error) {
    console.error('/interview/session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
