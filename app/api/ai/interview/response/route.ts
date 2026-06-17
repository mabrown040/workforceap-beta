import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { loadCoachContextBlock } from '@/lib/ai/coachContextBlock';
import { interviewSessions } from '../_sessionStore';
import { interviewResponseSchema } from '@/lib/validation/aiInterview';

const MAX_QUESTIONS = 5;

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'This feature is temporarily unavailable. Please try again soon.' },
        { status: 503 }
      );
    }

    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { sessionId, answer } = (body as Record<string, string>) || {};
    if (!sessionId || typeof answer !== 'string') {
      return NextResponse.json({ error: 'sessionId and answer are required' }, { status: 400 });
    }

    const session = interviewSessions.get(sessionId);
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    if (session.completedAt) {
      return NextResponse.json({ error: 'Interview already completed', complete: true }, { status: 409 });
    }

    const currentQuestion = session.questions[session.questions.length - 1];
    session.responses.push({ question: currentQuestion.question, answer });

    const isComplete = session.questions.length >= MAX_QUESTIONS;

    if (isComplete) {
      session.completedAt = new Date();
      return NextResponse.json({
        sessionId,
        complete: true,
        message: "Great work! You've completed the mock interview. View your results to see personalized feedback.",
        questionsAnswered: session.responses.length,
      });
    }

    const systemPrompt = `You are a career coach conducting a mock behavioral interview. Based on the conversation so far, ask ONE concise follow-up question. Use the candidate context below to keep questions relevant to their target role, but do NOT reference sensitive personal barriers in the question itself.${await loadCoachContextBlock(user.id)}

Return ONLY a JSON object with these exact keys:
- "question": the next interview question
- "type": "behavioral"
- "category": one of [communication, leadership, problem_solving, teamwork, adaptability]`;

    const history = session.responses
      .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`)
      .join('\n\n');

    const userPrompt = `Interview history:\n\n${history}\n\nAsk the next question (question ${session.questions.length + 1} of ${MAX_QUESTIONS}).`;

    const raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 800, temperature: 0.7 }
    );

    if (!raw) {
      return NextResponse.json({ error: 'We could not generate the next question. Please try again.' }, { status: 500 });
    }

    let parsed: {
      question: string;
      type: string;
      category: string;
    };
    try {
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const rawParsed = JSON.parse(jsonStr);
      const validated = interviewResponseSchema.safeParse(rawParsed);
      if (validated.success) {
        parsed = validated.data;
      } else {
        parsed = {
          question: raw.slice(0, 300),
          type: 'behavioral',
          category: 'communication',
        };
      }
    } catch {
      parsed = {
        question: raw.slice(0, 300),
        type: 'behavioral',
        category: 'communication',
      };
    }

    session.questions.push({ question: parsed.question, type: parsed.type });

    return NextResponse.json({
      sessionId,
      complete: false,
      question: parsed.question,
      type: parsed.type,
      category: parsed.category,
      questionsAnswered: session.responses.length,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (error) {
    console.error('/ai/interview/response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
