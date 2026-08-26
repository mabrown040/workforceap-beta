import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion } from '@/lib/ai/groq';
import { ifAiUnconfigured } from '@/lib/ai/aiUnavailableResponse';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { loadCoachContextBlock } from '@/lib/ai/coachContextBlock';
import { interviewSessions } from '../_sessionStore';
import { interviewStartResponseSchema } from '@/lib/validation/aiInterview';

// In-memory session store (replace with Redis/DB for production)
export const POST = withApiGuc(async (request: Request) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unconfigured = ifAiUnconfigured();
    if (unconfigured) return unconfigured;

    const { success } = await checkAIToolRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    // Verify member profile exists
    const member = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      select: { id: true, fullName: true, enrolledProgram: true },
    }));
    if (!member) {
      return NextResponse.json({ error: 'Member profile not found' }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { role, experienceLevel } = (body as Record<string, string>) || {};

    const sessionId = randomUUID();

    const systemPrompt = `You are a career coach conducting a mock behavioral interview. Generate a warm, professional opening and the first interview question. Use the candidate context below to keep the opening encouraging and to tailor the question to where they are — but do NOT mention sensitive personal barriers out loud in the interview.${await loadCoachContextBlock(user.id)}

Return ONLY a JSON object with these exact keys:
- "opening": a brief friendly greeting (1 sentence)
- "question": the first behavioral interview question
- "type": "behavioral"
- "category": one of [communication, leadership, problem_solving, teamwork, adaptability]`;

    const userPrompt = `Start a mock interview for a ${role || 'professional'} role${experienceLevel ? ` at ${experienceLevel} level` : ''}.`;

    const raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 800, temperature: 0.7 }
    );

    if (!raw) {
      return NextResponse.json({ error: 'We could not start the interview. Please try again.' }, { status: 500 });
    }

    let parsed: {
      opening: string;
      question: string;
      type: string;
      category: string;
    };
    try {
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      const rawParsed = JSON.parse(jsonStr);
      const validated = interviewStartResponseSchema.safeParse(rawParsed);
      if (validated.success) {
        parsed = validated.data;
      } else {
        parsed = {
          opening: "Let's get started with your mock interview.",
          question: raw.slice(0, 300),
          type: 'behavioral',
          category: 'communication',
        };
      }
    } catch {
      parsed = {
        opening: "Let's get started with your mock interview.",
        question: raw.slice(0, 300),
        type: 'behavioral',
        category: 'communication',
      };
    }

    interviewSessions.set(sessionId, {
      userId: user.id,
      questions: [{ question: parsed.question, type: parsed.type }],
      responses: [],
      startedAt: new Date(),
    });

    return NextResponse.json({
      sessionId,
      opening: parsed.opening,
      question: parsed.question,
      type: parsed.type,
      category: parsed.category,
    });
  } catch (error) {
    console.error('/ai/interview/start:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
