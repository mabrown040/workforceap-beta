import { NextRequest, NextResponse } from 'next/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { getUser } from '@/lib/auth/server';
import { saveAIToolResult } from '@/lib/ai/saveResult';
import { chatCompletion } from '@/lib/ai/groq';
import { prisma } from '@/lib/db/prisma';
import { sendVoiceInterviewTranscriptEmail } from '@/lib/email';

const ALLOWED_TYPES = ['technical', 'behavioral', 'general'] as const;
type InterviewType = (typeof ALLOWED_TYPES)[number];

interface HistoryBody {
  sessionId?: string;
  answers?: string[];
  questions?: string[];
  role?: string;
  interviewType?: string;
  transcriptTurns?: { role: 'agent' | 'user'; text: string }[];
}

async function generateFeedback(params: {
  role: string;
  interviewType: InterviewType;
  answers: string[];
  questions: string[];
}): Promise<string> {
  const transcript = params.answers
    .map((answer, index) => {
      const question = params.questions[index] ?? `Question ${index + 1}`;
      return `Q${index + 1}: ${question}\nA${index + 1}: ${answer}`;
    })
    .join('\n\n');

  const systemPrompt = 'You are an interview coach. Provide concise, actionable feedback with clear strengths and improvements.';
  const userPrompt = [
    `Role: ${params.role}`,
    `Interview type: ${params.interviewType}`,
    'Review this interview transcript and provide:',
    '1) A brief overall assessment',
    '2) Top 3 strengths',
    '3) Top 3 areas to improve',
    '4) One concrete next-step action',
    '',
    transcript,
  ].join('\n');

  // Try Anthropic first
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-latest',
        max_tokens: 900,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      const feedback = payload.content?.find((item) => item.type === 'text')?.text?.trim();
      if (feedback) return feedback;
    }
  }

  // Fall back to Groq
  const groqResult = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { maxTokens: 900, temperature: 0.3 }
  );
  if (groqResult) return groqResult;

  throw new Error('No AI provider configured — set ANTHROPIC_API_KEY or GROQ_API_KEY');
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '10') || 10;

  const results = await prisma.aIToolResult.findMany({
    where: { userId: user.id, toolType: 'interview_coach' },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 50),
    select: { id: true, inputSummary: true, output: true, createdAt: true },
  });

  const sessions = results.map(r => {
    try {
      const data = JSON.parse(r.output) as {
        role?: string;
        interviewType?: string;
        feedback?: string;
        questions?: string[];
        answers?: string[];
        sessionId?: string;
        transcriptTurns?: { role: 'agent' | 'user'; text: string }[];
      };
      return {
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        role: data.role || r.inputSummary,
        interviewType: data.interviewType || 'behavioral',
        feedback: data.feedback || '',
        questions: data.questions || [],
        answers: data.answers || [],
        sessionId: data.sessionId || r.id,
        transcriptTurns: Array.isArray(data.transcriptTurns) ? data.transcriptTurns : [],
      };
    } catch {
      return null;
    }
  }).filter(Boolean);

  return NextResponse.json({ sessions });
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
  const transcriptTurns: { role: 'agent' | 'user'; text: string }[] = Array.isArray(body.transcriptTurns)
    ? body.transcriptTurns
        .map((turn): { role: 'agent' | 'user'; text: string } => ({
          role: turn?.role === 'agent' ? 'agent' : 'user',
          text: typeof turn?.text === 'string' ? turn.text.trim() : '',
        }))
        .filter((turn) => turn.text.length > 0)
    : [];

  const interviewType = interviewTypeRaw as InterviewType;

  try {
    const feedback = await generateFeedback({ role, interviewType, answers, questions });

    await ensureUserInDb(user);
    await saveAIToolResult(
      user.id,
      'interview_coach',
      `${interviewType} interview feedback for ${role}`,
      JSON.stringify({ sessionId, role, interviewType, answers, questions, transcriptTurns, feedback })
    );

    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { fullName: true, email: true },
      });

      const adminUsers = await prisma.user.findMany({
        where: {
          profile: {
            is: {
              role: { in: ['admin', 'super_admin'] },
            },
          },
        },
        select: { email: true },
      });

      const configuredRecipients = (process.env.VOICE_INTERVIEW_TRANSCRIPT_EMAILS ?? '')
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      const recipientEmails = Array.from(
        new Set([
          ...configuredRecipients,
          ...adminUsers.map((entry) => entry.email).filter(Boolean),
        ])
      );

      if (recipientEmails.length > 0) {
        await sendVoiceInterviewTranscriptEmail({
          to: recipientEmails,
          memberName: dbUser?.fullName?.trim() || user.email || 'WorkforceAP member',
          memberEmail: dbUser?.email?.trim() || user.email || null,
          role,
          interviewType,
          transcriptTurns,
          feedback,
          sessionId,
        });
      }
    } catch (emailErr) {
      console.error('Interview transcript email error:', emailErr);
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Interview history error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
