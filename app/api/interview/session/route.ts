import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { chatCompletion } from '@/lib/ai/groq';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    role: string;
    interviewType: string;
    transcript?: { question: string; answer: string }[];
    nextQuestion?: boolean;
  };
  const { role, interviewType, transcript, nextQuestion } = body;

  if (!role || !interviewType) {
    return NextResponse.json({ error: 'role and interviewType are required' }, { status: 400 });
  }

  const systemPrompt = `You are a professional job interviewer conducting a ${interviewType} interview for a ${role} position. Ask one realistic interview question at a time. Be concise and direct. Do not add preamble or commentary — just the question.`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (nextQuestion && transcript?.length) {
    // Build conversation history for follow-up questions
    for (const entry of transcript) {
      messages.push({ role: 'assistant', content: entry.question });
      messages.push({ role: 'user', content: entry.answer });
    }
    messages.push({ role: 'user', content: 'Next question please.' });
  } else {
    messages.push({ role: 'user', content: 'Please ask your first interview question.' });
  }

  const question = await chatCompletion(messages, { maxTokens: 200 });
  const firstQuestion = question ?? `Tell me about yourself and why you're interested in the ${role} role.`;
  const sessionId = `${user.id}-${Date.now()}`;

  return NextResponse.json({ sessionId, firstQuestion, role, interviewType });
}
