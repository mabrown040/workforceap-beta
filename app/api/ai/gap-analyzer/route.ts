import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { ensureUserInDb } from '@/lib/auth/ensureUser';
import { checkAIToolRateLimit } from '@/lib/rate-limit';
import { gapAnalyzerSchema } from '@/lib/validation/gapAnalyzer';
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

  const parsed = gapAnalyzerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 400 }
    );
  }

  const { resume } = parsed.data;

  const systemPrompt = `You are a career coach specializing in resume gaps. Analyze a resume for employment gaps and provide actionable framing.

For each gap you detect:
1. GAP: [Date range] — [Brief description, e.g. "18 months between roles"]
2. SUGGESTED FRAMING: [1-2 sentences they can use in cover letter or interview]
- Cover letter: How to address it professionally
- Interview: Talking point that acknowledges without apologizing

Be supportive, not judgmental. Gaps are common—caregiving, education, health, job search. Focus on what they DID during the gap if possible (e.g. freelance, certifications, volunteer). If no info, suggest neutral framing.

Format your response as:
---
GAP 1: [date range]
Framing: [cover letter language]
Interview talking point: [what to say]

GAP 2: ...
---

If no significant gaps are found, say: "No significant employment gaps detected. Your work history appears continuous."`;

  const userPrompt = `Resume:
---
${resume}
---

Identify any employment gaps and provide framing language for each.`;

  try {
    const output = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { maxTokens: 1500, temperature: 0.5 }
    );

    if (!output) return NextResponse.json({ error: 'No response from AI' }, { status: 500 });

    const summary = resume.slice(0, 80) + (resume.length > 80 ? '...' : '');
    try {
      await ensureUserInDb(user);
      await saveAIToolResult(user.id, 'gap_analyzer', summary, output);
    } catch (saveErr) {
      console.error('Gap analyzer: failed to save result', saveErr);
    }

    return NextResponse.json({ output });
  } catch (err) {
    console.error('Gap analyzer error:', err);
    return NextResponse.json(
      { error: 'Failed to analyze gaps. Please try again.' },
      { status: 500 }
    );
  }
}
