import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { chatCompletion } from '@/lib/ai/groq';

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    role: string;
    interviewType: string;
    transcript: { question: string; answer: string }[];
    sessionId?: string;
  };
  const { role, interviewType, transcript } = body;

  if (!transcript?.length) {
    return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
  }

  const transcriptText = transcript
    .map((t, i) => `Q${i + 1}: ${t.question}\nA${i + 1}: ${t.answer}`)
    .join('\n\n');

  const feedbackResult = await chatCompletion([
    {
      role: 'system',
      content: `You are an expert career coach reviewing a ${interviewType} interview for a ${role} position. Provide structured, actionable feedback.`,
    },
    {
      role: 'user',
      content: `Here is the interview transcript:\n\n${transcriptText}\n\nProvide:\n1. Overall assessment (2-3 sentences)\n2. Top 2 strengths\n3. Top 2 areas to improve\n4. One key tip for next time`,
    },
  ], { maxTokens: 600 });

  const feedback = feedbackResult ?? 'Thank you for completing the practice interview. Review your answers and focus on using the STAR method (Situation, Task, Action, Result) for behavioral questions.';

  await prisma.aIToolResult.create({
    data: {
      userId: user.id,
      toolType: 'interview_coach',
      inputSummary: `${interviewType} interview for ${role} (${transcript.length} questions)`,
      output: JSON.stringify({ transcript, feedback }),
    },
  });

  return NextResponse.json({ feedback });
}

export async function GET(_req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const results = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_coach' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, inputSummary: true, createdAt: true },
  });

  return NextResponse.json({ results });
}
