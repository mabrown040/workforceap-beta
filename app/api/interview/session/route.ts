import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { getUser } from '@/lib/auth/server';
import { saveAIToolResult } from '@/lib/ai/saveResult';

const ALLOWED_TYPES = ['technical', 'behavioral', 'general'] as const;
type InterviewType = (typeof ALLOWED_TYPES)[number];

interface SessionBody {
  role?: string;
  interviewType?: string;
  sessionId?: string;
  answers?: string[];
}

async function generateQuestion(params: {
  role: string;
  interviewType: InterviewType;
  answers: string[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const { role, interviewType, answers } = params;
  const turn = answers.length + 1;
  const priorAnswers = answers.length > 0
    ? answers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')
    : 'No answers yet.';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 220,
      temperature: 0.6,
      system: 'You are a concise interview coach. Ask one interview question only. No bullet points, no preamble.',
      messages: [
        {
          role: 'user',
          content: [
            `Role: ${role}`,
            `Interview type: ${interviewType}`,
            `Turn: ${turn} of 5`,
            'Prior candidate answers:',
            priorAnswers,
            'Generate the next best interview question as plain text.',
          ].join('\n'),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const question = payload.content?.find((item) => item.type === 'text')?.text?.trim();

  if (!question) {
    throw new Error('No question returned from Anthropic');
  }

  return question;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SessionBody;
  try {
    body = (await req.json()) as SessionBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const role = body.role?.trim() ?? '';
  const interviewTypeRaw = body.interviewType?.trim().toLowerCase() ?? '';

  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(interviewTypeRaw as InterviewType)) {
    return NextResponse.json({ error: 'interviewType must be Technical, Behavioral, or General' }, { status: 400 });
  }

  const interviewType = interviewTypeRaw as InterviewType;
  const answers = Array.isArray(body.answers)
    ? body.answers.map((answer) => answer.trim()).filter((answer) => answer.length > 0)
    : [];

  try {
    const firstQuestion = await generateQuestion({ role, interviewType, answers });
    const sessionId = body.sessionId?.trim() || randomUUID();

    await ensureUserInDb(user);
    await saveAIToolResult(
      user.id,
      'interview_coach',
      `${interviewType} interview for ${role} (turn ${answers.length + 1})`,
      JSON.stringify({ sessionId, firstQuestion, answersCount: answers.length })
    );

    return NextResponse.json({ sessionId, firstQuestion });
  } catch (error) {
    console.error('Interview session error:', error);
    return NextResponse.json({ error: 'Failed to generate interview question' }, { status: 500 });
  }
}
