import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion } from '@/lib/ai/groq';

export type InterviewType = 'technical' | 'behavioral' | 'general';

interface SessionTurnBody {
  role: string;
  interviewType: InterviewType;
  transcript: Array<{ speaker: 'interviewer' | 'candidate'; text: string }>;
  candidateMessage: string;
  questionIndex: number;
}

function buildSystemPrompt(role: string, interviewType: InterviewType): string {
  const typeDesc =
    interviewType === 'technical'
      ? 'technical (focus on skills, problem-solving, and domain knowledge)'
      : interviewType === 'behavioral'
        ? 'behavioral (focus on past experiences using STAR method)'
        : 'general (mix of background, motivation, and situational questions)';

  return `You are a professional job interviewer conducting a ${typeDesc} interview for a ${role} position.

Guidelines:
- Ask realistic interview questions one at a time.
- After the candidate responds, briefly acknowledge their answer (1 sentence), then ask the next question.
- Keep your responses concise — one acknowledgment sentence + one question.
- After 5-7 questions total, provide constructive feedback on their overall performance.
- When providing final feedback, start your message with "FEEDBACK:" and give 3-4 sentences covering strengths and areas to improve.
- Be professional, encouraging, and realistic.
- Do NOT number your questions.
- Do NOT say things like "Great answer!" every time — vary your acknowledgments.`;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again in an hour.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    role,
    interviewType,
    transcript,
    candidateMessage,
    questionIndex,
  } = body as SessionTurnBody;

  if (!role || typeof role !== 'string' || role.length > 200) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const validTypes: InterviewType[] = ['technical', 'behavioral', 'general'];
  if (!validTypes.includes(interviewType)) {
    return NextResponse.json({ error: 'Invalid interview type' }, { status: 400 });
  }

  if (typeof candidateMessage !== 'string') {
    return NextResponse.json({ error: 'Invalid message' }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(role, interviewType);

  // Build conversation history for the AI
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  if (Array.isArray(transcript)) {
    for (const turn of transcript.slice(-12)) {
      // Keep last 12 turns for context
      messages.push({
        role: turn.speaker === 'interviewer' ? 'assistant' : 'user',
        content: turn.text,
      });
    }
  }

  // Add the new candidate message
  if (candidateMessage.trim()) {
    messages.push({ role: 'user', content: candidateMessage.trim() });
  } else if (questionIndex === 0) {
    // First turn — prompt the interviewer to start
    messages.push({
      role: 'user',
      content: 'Please start the interview by introducing yourself briefly and asking your first question.',
    });
  }

  try {
    const response = await chatCompletion(messages, { maxTokens: 400, temperature: 0.7 });
    if (!response) {
      return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 });
    }

    const isFeedback = response.trim().startsWith('FEEDBACK:');
    const cleanResponse = isFeedback ? response.replace(/^FEEDBACK:\s*/i, '') : response;

    return NextResponse.json({
      message: cleanResponse,
      isFeedback,
      questionIndex: isFeedback ? questionIndex : questionIndex + 1,
    });
  } catch (err) {
    console.error('[interview/session] Error:', err);
    return NextResponse.json(
      { error: 'Failed to get AI response. Please try again.' },
      { status: 500 }
    );
  }
}
