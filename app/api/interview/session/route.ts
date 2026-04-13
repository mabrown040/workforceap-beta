import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { chatCompletion } from '@/lib/ai/groq';
import { getElevenLabsAgentId, startElevenLabsPortalSession } from '@/lib/ai/elevenlabsAgents';
import { fetchMemberPortalDynamicVariables } from '@/lib/ai/elevenlabsPortalContext';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * POST /api/interview/session
 *
 * Two modes:
 * 1. ElevenLabs voice: returns a signed conversation URL when ELEVENLABS_API_KEY is set
 * 2. Groq text fallback: returns the first AI question as plain text
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    role: string;
    interviewType: string;
    transcript?: { question: string; answer: string }[];
    nextQuestion?: boolean;
    forceText?: boolean;
  };
  const { role, interviewType, transcript, nextQuestion, forceText } = body;

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
  const systemPrompt = `You are a professional job interviewer conducting a ${interviewType} interview for a ${role} position. Ask one realistic interview question at a time. Be concise and direct. Do not add preamble or commentary — just the question.`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (nextQuestion && transcript?.length) {
    for (const entry of transcript) {
      messages.push({ role: 'assistant', content: entry.question });
      messages.push({ role: 'user', content: entry.answer });
    }
    messages.push({ role: 'user', content: 'Next question please.' });
  } else {
    messages.push({ role: 'user', content: 'Please ask your first interview question.' });
  }

  const question = await chatCompletion(messages, { maxTokens: 200 });
  const firstQuestion = question ?? `Tell me about yourself and why you are interested in the ${role} role.`;

  return NextResponse.json({
    mode: 'text',
    firstQuestion,
    role,
    interviewType,
    sessionId: `${user.id}-${Date.now()}`,
  });
}
