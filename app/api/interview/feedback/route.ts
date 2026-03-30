import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { chatCompletion } from '@/lib/ai/groq';

/**
 * POST /api/interview/feedback
 * Returns per-question structured feedback: strengths, improve, example answer.
 */
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    role: string;
    interviewType: string;
    question: string;
    answer: string;
  };
  const { role, interviewType, question, answer } = body;

  const result = await chatCompletion([
    {
      role: 'system',
      content: `You are an expert career coach reviewing a single interview answer for a ${interviewType} interview for a ${role} position. Return feedback as JSON only — no other text.`,
    },
    {
      role: 'user',
      content: `Question: "${question}"\n\nCandidate's answer: "${answer}"\n\nReturn JSON with exactly these keys:\n{\n  "strengths": ["strength 1", "strength 2"],\n  "improve": ["improvement 1", "improvement 2"],\n  "example": "A one-sentence example of a stronger answer"\n}`,
    },
  ], { maxTokens: 400, temperature: 0.4 });

  if (!result) {
    return NextResponse.json({ strengths: ['Good effort'], improve: ['Add more specific details'], example: '' });
  }

  try {
    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { strengths: string[]; improve: string[]; example: string };
      return NextResponse.json(parsed);
    }
  } catch {
    // Fall through to default
  }

  return NextResponse.json({ strengths: ['Good attempt'], improve: ['Be more specific with examples'], example: '' });
}
