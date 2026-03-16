import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { interviewPracticeSchema } from '@/lib/validation/interviewPractice';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';

const LEVEL_PROMPTS = {
  entry: 'entry-level / junior (0-2 years experience)',
  mid: 'mid-level (3-7 years experience)',
  senior: 'senior / lead (8+ years experience)',
};

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });
  }

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = interviewPracticeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { role, experienceLevel, count } = parsed.data;
  const levelDesc = LEVEL_PROMPTS[experienceLevel];

  const systemPrompt = `You are a career coach and interview preparation expert. Generate interview questions for job seekers.

Format your response as a JSON array of objects. Each object must have:
- "question": the interview question (string)
- "type": "behavioral" or "technical" (string)
- "tip": brief answer tip or framework (string, 1-2 sentences)
- "starHint": optional hint for STAR method if behavioral (string)
- "exampleAnswer": a 2-3 sentence example answer showing how to respond. For behavioral questions, use STAR (Situation, Task, Action, Result). For technical questions, show a concise, structured response. This helps members see what a strong answer looks like.

Return ONLY the JSON array, no other text.`;

  const userPrompt = `Generate ${count} interview questions for a ${role} role at ${levelDesc} level.

Include a mix of behavioral (STAR method) and technical questions. Make them specific to this role. For each question, provide an exampleAnswer that demonstrates a strong 2-3 sentence response.`;

  try {
    const raw = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 2500, temperature: 0.8 }
    );
    if (!raw) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = raw;
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) jsonStr = match[0];

    const questions = JSON.parse(jsonStr) as Array<{ question: string; type: string; tip: string; starHint?: string; exampleAnswer?: string }>;
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'Invalid response format' }, { status: 500 });
    }

    const output = JSON.stringify(questions);
    const summary = `${role} (${experienceLevel})`;
    try {
      await ensureUserInDb(user);
      await saveAIToolResult(user.id, 'interview_practice', summary, output);
    } catch (saveErr) {
      console.error('Interview practice: failed to save result', saveErr);
    }

    return NextResponse.json({ questions });
  } catch (err) {
    console.error('Interview practice error:', err);
    return NextResponse.json(
      { error: 'Failed to generate questions. Please try again.' },
      { status: 500 }
    );
  }
}
