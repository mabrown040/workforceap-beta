import { NextRequest, NextResponse } from 'next/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { getUser } from '@/lib/auth/server';
import { saveAIToolResult } from '@/lib/ai/saveResult';

const ALLOWED_TYPES = ['technical', 'behavioral', 'general'] as const;
type InterviewType = (typeof ALLOWED_TYPES)[number];

interface HistoryBody {
  sessionId?: string;
  answers?: string[];
  questions?: string[];
  role?: string;
  interviewType?: string;
}

async function generateFeedback(params: {
  role: string;
  interviewType: InterviewType;
  answers: string[];
  questions: string[];
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const transcript = params.answers
    .map((answer, index) => {
      const question = params.questions[index] ?? `Question ${index + 1}`;
      return `Q${index + 1}: ${question}\nA${index + 1}: ${answer}`;
    })
    .join('\n\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
      max_tokens: 900,
      temperature: 0.3,
      system: 'You are an interview coach. Provide concise, actionable feedback with clear strengths and improvements.',
      messages: [
        {
          role: 'user',
          content: [
            `Role: ${params.role}`,
            `Interview type: ${params.interviewType}`,
            'Review this interview transcript and provide:',
            '1) A brief overall assessment',
            '2) Top 3 strengths',
            '3) Top 3 areas to improve',
            '4) One concrete next-step action',
            '',
            transcript,
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

  const feedback = payload.content?.find((item) => item.type === 'text')?.text?.trim();
  if (!feedback) {
    throw new Error('No feedback returned from Anthropic');
  }

  return feedback;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: HistoryBody;
  try {
    body = (await req.json()) as HistoryBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const role = body.role?.trim() ?? '';
  const interviewTypeRaw = body.interviewType?.trim().toLowerCase() ?? '';
  const sessionId = body.sessionId?.trim() ?? '';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  if (!role) {
    return NextResponse.json({ error: 'role is required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(interviewTypeRaw as InterviewType)) {
    return NextResponse.json({ error: 'interviewType must be Technical, Behavioral, or General' }, { status: 400 });
  }

  const answers = Array.isArray(body.answers)
    ? body.answers.map((answer) => answer.trim()).filter((answer) => answer.length > 0)
    : [];
  if (answers.length === 0) {
    return NextResponse.json({ error: 'answers are required' }, { status: 400 });
  }

  const questions = Array.isArray(body.questions)
    ? body.questions.map((question) => question.trim()).filter((question) => question.length > 0)
    : [];

  const interviewType = interviewTypeRaw as InterviewType;

  try {
    const feedback = await generateFeedback({ role, interviewType, answers, questions });

    await ensureUserInDb(user);
    await saveAIToolResult(
      user.id,
      'interview_coach',
      `${interviewType} interview feedback for ${role}`,
      JSON.stringify({ sessionId, answers, questions, feedback })
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Interview history error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
