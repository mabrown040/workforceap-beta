import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { loadCoachContextBlock } from '@/lib/ai/coachContextBlock';
import { interviewSessions } from '../_sessionStore';
import { interviewResultsResponseSchema } from '@/lib/validation/aiInterview';
import { withApiGuc } from '@/lib/db/withRequestGuc';

const CATEGORIES = ['communication', 'leadership', 'problem_solving', 'teamwork', 'adaptability'] as const;

async function _GET(request: Request) {
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

    const { success: withinLimit } = await checkAIToolRateLimit(user.id);
    if (!withinLimit) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a few minutes.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const session = interviewSessions.get(sessionId);
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Interview session not found' }, { status: 404 });
    }

    const systemPrompt = `You are a career coach reviewing a mock interview. Provide constructive feedback and scores. Use the candidate context below to make your encouragement and improvement tips specific to their goals and situation — be warm and never discouraging.${await loadCoachContextBlock(user.id)}

Return ONLY a JSON object with these exact keys:
- "overallScore": number 0-100
- "categories": array of objects with "name" (one of ${CATEGORIES.join(', ')}), "score" (0-100), "feedback" (1-2 sentences)
- "strengths": array of 2-3 strings
- "improvements": array of 3-5 specific actionable tips
- "summary": 2-3 sentence overall summary`;

    const history = session.responses
      .map((r, i) => `Q${i + 1}: ${r.question}\nA${i + 1}: ${r.answer}`)
      .join('\n\n');

    const userPrompt = `Review this mock interview and provide scores and feedback:\n\n${history}`;

    const raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2000, temperature: 0.6 }
    );

    let parsed: {
      overallScore: number;
      categories: Array<{ name: string; score: number; feedback: string }>;
      strengths: string[];
      improvements: string[];
      summary: string;
    };

    if (!raw) {
      parsed = {
        overallScore: 70,
        categories: CATEGORIES.map((name) => ({
          name,
          score: 70,
          feedback: `Keep practicing ${name.replace('_', ' ')} questions to build confidence.`,
        })),
        strengths: ['You completed the full interview.'],
        improvements: ['Use the STAR method for behavioral questions.', 'Provide specific examples.', 'Keep answers concise and focused.'],
        summary: 'You completed the mock interview. Keep practicing to improve your responses.',
      };
    } else {
      try {
        const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
        const rawParsed = JSON.parse(jsonStr);
        const validated = interviewResultsResponseSchema.safeParse(rawParsed);
        if (validated.success) {
          parsed = validated.data;
        } else {
          parsed = {
            overallScore: 70,
            categories: CATEGORIES.map((name) => ({
              name,
              score: 70,
              feedback: `Keep practicing ${name.replace('_', ' ')} questions to build confidence.`,
            })),
            strengths: ['You completed the full interview.'],
            improvements: ['Use the STAR method for behavioral questions.', 'Provide specific examples.', 'Keep answers concise and focused.'],
            summary: 'You completed the mock interview. Keep practicing to improve your responses.',
          };
        }
      } catch {
        parsed = {
          overallScore: 70,
          categories: CATEGORIES.map((name) => ({
            name,
            score: 70,
            feedback: `Keep practicing ${name.replace('_', ' ')} questions to build confidence.`,
          })),
          strengths: ['You completed the full interview.'],
          improvements: ['Use the STAR method for behavioral questions.', 'Provide specific examples.', 'Keep answers concise and focused.'],
          summary: 'You completed the mock interview. Keep practicing to improve your responses.',
        };
      }
    }

    return NextResponse.json({
      sessionId,
      summary: parsed.summary,
      overallScore: parsed.overallScore,
      categories: parsed.categories,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      questionsAnswered: session.responses.length,
      completedAt: session.completedAt?.toISOString() ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error('/ai/interview/results:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(_GET);
