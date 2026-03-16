import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { jobMatchScorerSchema } from '@/lib/validation/jobMatchScorer';
import { chatCompletion, isAIConfigured } from '@/lib/ai/groq';
import { saveAIToolResult } from '@/lib/ai/saveResult';

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAIConfigured()) return NextResponse.json({ error: 'AI service not configured' }, { status: 503 });

  const { success } = await checkAIToolRateLimit(user.id);
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded. Try again in an hour.' }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = jobMatchScorerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { resume, jobDescription } = parsed.data;

  const systemPrompt = `You are a career coach and ATS expert. Analyze how well a candidate's resume matches a job description.

Your response MUST follow this exact format:

MATCH SCORE: [number]%
(Use a number 0-100. Be realistic—most candidates are 50-75% matched. Only give 90+ for near-perfect fits.)

STRENGTHS:
• [bullet 1 - specific skill/experience they have that matches]
• [bullet 2]
• [2-4 bullets total]

GAPS TO ADDRESS:
• [bullet 1 - specific requirement they're missing, e.g. "ServiceNow experience", "ITIL certification"]
• [bullet 2]
• [2-5 bullets total. Be specific and actionable. These are why they might not get callbacks.]

QUICK WINS:
• [1-2 bullets: easiest ways to improve the match—e.g. "Add 'project management' if you've led any cross-team work", "Highlight your SQL experience more prominently"]

Keep it concise. No fluff. Members want to know exactly why they're not getting callbacks and what to fix.`;

  const userPrompt = `Job description:
---
${jobDescription}
---

Candidate's resume:
---
${resume}
---

Analyze the match and output in the format above.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 1200, temperature: 0.5 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const summary = jobDescription.slice(0, 80) + (jobDescription.length > 80 ? '...' : '');
    try {
      await ensureUserInDb(user);
      await saveAIToolResult(user.id, 'job_match_scorer', summary, output);
    } catch (saveErr) {
      console.error('Job match scorer: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('Job match scorer error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze match. Please try again.' },
      { status: 500 }
    );
  }
}
